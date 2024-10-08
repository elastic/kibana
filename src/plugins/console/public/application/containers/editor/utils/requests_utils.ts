/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, ParsedRequest } from '@kbn/monaco';
import { parse } from 'hjson';
import { constructUrl } from '../../../../lib/es';
import type { MetricsTracker } from '../../../../types';
import type { DevToolsVariable } from '../../../components';
import type { EditorRequest, AdjustedParsedRequest } from '../types';
import {
  urlVariableTemplateRegex,
  dataVariableTemplateRegex,
  startsWithMethodRegex,
} from './constants';
import { parseLine } from './tokens_utils';

/*
 * This function replaces any variables with its values stored in localStorage.
 * For example 'GET ${exampleVariable1} -> 'GET _search'.
 */
export const replaceRequestVariables = (
  { method, url, data }: EditorRequest,
  variables: DevToolsVariable[]
): EditorRequest => {
  return {
    method,
    url: replaceVariables(url, variables, false),
    data: data.map((dataObject) => replaceVariables(dataObject, variables, true)),
  };
};

/*
 * This function converts a request into a corresponding CURL command.
 */
export const getCurlRequest = (
  { method, url, data }: EditorRequest,
  elasticsearchBaseUrl: string
): string => {
  const curlUrl = constructUrl(elasticsearchBaseUrl, url);
  let curlRequest = `curl -X${method} "${curlUrl}" -H "kbn-xsrf: reporting"`;
  if (data && data.length) {
    const joinedData = data.join('\n');

    curlRequest += ` -H "Content-Type: application/json" -d'\n`;

    // We escape single quoted strings that are wrapped in single quoted strings
    curlRequest += joinedData.replace(/'/g, "'\\''");
    curlRequest += "'";
  }
  return curlRequest;
};

/*
 * This function uses the telemetry to track requests sent via Console.
 */
export const trackSentRequests = (
  requests: EditorRequest[],
  trackUiMetric: MetricsTracker
): void => {
  requests.map(({ method, url }) => {
    const eventName = `${method}_${url}`;
    trackUiMetric.count(eventName);
  });
};

/*
 * This function converts the start offset value of the parsed request to a line number in the model
 */
export const getRequestStartLineNumber = (
  parsedRequest: ParsedRequest,
  model: monaco.editor.ITextModel
): number => {
  return model.getPositionAt(parsedRequest.startOffset).lineNumber;
};

/*
 * This function converts the end offset value of the parsed request to a line number in the model.
 * If there is no end offset (the parser was not able to parse this request completely),
 * then the last non-empty line is returned or the line before the next request.
 */
export const getRequestEndLineNumber = ({
  parsedRequest,
  nextRequest,
  model,
  startLineNumber,
}: {
  parsedRequest: ParsedRequest;
  nextRequest?: ParsedRequest;
  model: monaco.editor.ITextModel;
  startLineNumber: number;
}): number => {
  let endLineNumber: number;
  if (parsedRequest.endOffset) {
    // if the parser set an end offset for this request, then find the line number for it
    endLineNumber = model.getPositionAt(parsedRequest.endOffset).lineNumber;
  } else {
    // if no end offset, try to find the line before the next request starts
    if (nextRequest) {
      const nextRequestStartLine = model.getPositionAt(nextRequest.startOffset).lineNumber;
      endLineNumber =
        nextRequestStartLine > startLineNumber ? nextRequestStartLine - 1 : startLineNumber;
    } else {
      // if there is no next request, find the end of the text or the line that starts with a method
      let nextLineNumber = model.getPositionAt(parsedRequest.startOffset).lineNumber + 1;
      let nextLineContent: string;
      while (nextLineNumber <= model.getLineCount()) {
        nextLineContent = model.getLineContent(nextLineNumber).trim();
        if (nextLineContent.match(startsWithMethodRegex)) {
          // found a line that starts with a method, stop iterating
          break;
        }
        nextLineNumber++;
      }
      // nextLineNumber is now either the line with a method or 1 line after the end of the text
      // set the end line for this request to the line before nextLineNumber
      endLineNumber = nextLineNumber > startLineNumber ? nextLineNumber - 1 : startLineNumber;
    }
  }
  // if the end line is empty, go up to find the first non-empty line
  let lineContent = model.getLineContent(endLineNumber).trim();
  while (!lineContent) {
    endLineNumber = endLineNumber - 1;
    lineContent = model.getLineContent(endLineNumber).trim();
  }
  return endLineNumber;
};

/**
 * This function takes a string containing unformatted Console requests and
 * returns a text in which the requests are auto-indented.
 * @param requests The list of {@link AdjustedParsedRequest} that are in the selected text in the editor.
 * @param selectedText The selected text in the editor.
 * @param allText The whole text input in the editor.
 */
export const getAutoIndentedRequests = (
  requests: AdjustedParsedRequest[],
  selectedText: string,
  allText: string
): string => {
  const selectedTextLines = selectedText.split(`\n`);
  const allTextLines = allText.split(`\n`);
  const formattedTextLines: string[] = [];

  let currentLineIndex = 0;
  let currentRequestIndex = 0;

  while (currentLineIndex < selectedTextLines.length) {
    const request = requests[currentRequestIndex];
    // Check if the current line is the start of the next request
    if (
      request &&
      selectedTextLines[currentLineIndex] === allTextLines[request.startLineNumber - 1]
    ) {
      // Start of a request
      const requestLines = allTextLines.slice(request.startLineNumber - 1, request.endLineNumber);
      const firstLine = cleanUpWhitespaces(requestLines[0]);
      formattedTextLines.push(firstLine);
      const dataLines = requestLines.slice(1);
      if (dataLines.some((line) => containsComments(line))) {
        // If data has comments, add it as it is - without formatting
        // TODO: Format requests with comments https://github.com/elastic/kibana/issues/182138
        formattedTextLines.push(...dataLines);
      } else {
        // If no comments, indent data
        if (requestLines.length > 1) {
          const dataString = dataLines.join('\n');
          const dataJsons = splitDataIntoJsonObjects(dataString);
          formattedTextLines.push(...dataJsons.map(indentData));
        }
      }

      currentLineIndex = currentLineIndex + requestLines.length;
      currentRequestIndex++;
    } else {
      // Current line is a comment or whitespaces
      // Trim white spaces and add it to the formatted text
      formattedTextLines.push(cleanUpWhitespaces(selectedTextLines[currentLineIndex]));
      currentLineIndex++;
    }
  }

  return formattedTextLines.join('\n');
};

/*
 * This function extracts a normalized method and url from the editor and
 * the "raw" text of the request body without any changes to it. The only normalization
 * for request body is to split several json objects into an array of strings.
 */
export const getRequestFromEditor = (
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number
): EditorRequest | null => {
  const methodUrlLine = model.getLineContent(startLineNumber).trim();
  if (!methodUrlLine) {
    return null;
  }
  const { method, url } = parseLine(methodUrlLine, false);
  if (!method || !url) {
    return null;
  }
  const upperCaseMethod = method.toUpperCase();

  if (endLineNumber <= startLineNumber) {
    return { method: upperCaseMethod, url, data: [] };
  }
  const dataString = model
    .getValueInRange({
      startLineNumber: startLineNumber + 1,
      startColumn: 1,
      endLineNumber,
      endColumn: model.getLineMaxColumn(endLineNumber),
    })
    .trim();
  const data = splitDataIntoJsonObjects(dataString);

  return { method: upperCaseMethod, url, data };
};

export const containsComments = (text: string) => {
  return text.indexOf('//') >= 0 || text.indexOf('/*') >= 0;
};

export const indentData = (dataString: string): string => {
  try {
    const parsedData = parse(dataString);

    return JSON.stringify(parsedData, null, 2);
  } catch (e) {
    return dataString;
  }
};

// ---------------------------------- Internal helpers ----------------------------------

const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const replaceVariables = (
  text: string,
  variables: DevToolsVariable[],
  isDataVariable: boolean
): string => {
  const variableRegex = isDataVariable ? dataVariableTemplateRegex : urlVariableTemplateRegex;
  if (variableRegex.test(text)) {
    text = text.replaceAll(variableRegex, (match, key) => {
      const variable = variables.find(({ name }) => name === key);
      const value = variable?.value;

      if (isDataVariable && value) {
        // If the variable value is an object, add it as it is. Otherwise, surround it with quotes.
        return isJsonString(value) ? value : `"${value}"`;
      }

      return value ?? match;
    });
  }
  return text;
};

const splitDataIntoJsonObjects = (dataString: string): string[] => {
  const jsonSplitRegex = /}\s*{/;
  if (dataString.match(jsonSplitRegex)) {
    return dataString.split(jsonSplitRegex).map((part, index, parts) => {
      let restoredBracketsString = part;
      // add an opening bracket to all parts except the 1st
      if (index > 0) {
        restoredBracketsString = `{${restoredBracketsString}`;
      }
      // add a closing bracket to all parts except the last
      if (index < parts.length - 1) {
        restoredBracketsString = `${restoredBracketsString}}`;
      }
      return restoredBracketsString;
    });
  }
  return [dataString];
};

const cleanUpWhitespaces = (line: string): string => {
  return line.trim().replaceAll(/\s+/g, ' ');
};
