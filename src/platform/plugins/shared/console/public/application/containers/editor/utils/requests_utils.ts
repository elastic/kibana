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
import { i18n } from '@kbn/i18n';
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

export const TRIPLE_QUOTE_STRINGS_MARKER = '"{tripleQuoteString}"';

/**
 * This function replaces all triple-quote strings with {@link TRIPLE_QUOTE_STRINGS_MARKER}
 */
export function collapseTripleQuoteStrings(data: string) {
  const splitData = data.split(`"""`);
  const tripleQuoteStrings = [];
  for (let i = 1; i < splitData.length - 1; i += 2) {
    tripleQuoteStrings.push('"""' + splitData[i] + '"""');
    splitData[i] = TRIPLE_QUOTE_STRINGS_MARKER;
  }
  return { collapsedTripleQuotesData: splitData.join(''), tripleQuoteStrings };
}

/**
 * This function replaces all {@link TRIPLE_QUOTE_STRINGS_MARKER}s in the provided text with the corresponding provided triple-quote strings.
 */
export function expandTripleQuoteStrings(data: string, tripleQuoteStrings: string[]) {
  const splitData = data.split(TRIPLE_QUOTE_STRINGS_MARKER);
  const allData = [];
  for (let i = 0; i < splitData.length; i++) {
    allData.push(splitData[i]);
    if (i < tripleQuoteStrings.length) {
      allData.push(tripleQuoteStrings[i]);
    }
  }
  return allData.join('');
}

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
  allText: string,
  addToastWarning: (text: string) => void
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
      if (containsComments(dataLines.join(''))) {
        // If data has comments, add it as it is - without formatting
        // TODO: Format requests with comments https://github.com/elastic/kibana/issues/182138
        formattedTextLines.push(...dataLines);
        addToastWarning(
          i18n.translate('console.notification.monaco.warning.nonSupportedAutoindentation', {
            defaultMessage:
              'Auto-indentation is currently not supported for requests containing comments. Please remove comments to enable formatting.',
          })
        );
      } else {
        // If no comments, indent data
        if (requestLines.length > 1) {
          const dataString = dataLines.join('\n');
          const dataJsons = splitDataIntoJsonObjects(dataString);
          formattedTextLines.push(
            ...dataJsons.map((data) => {
              // Since triple-quote strings are not a valid JSON syntax, we need to first collapse them before indenting the data
              const { collapsedTripleQuotesData, tripleQuoteStrings } =
                collapseTripleQuoteStrings(data);
              const indentedData = indentData(collapsedTripleQuotesData);
              // Return any collapsed triple-quote strings
              return expandTripleQuoteStrings(indentedData, tripleQuoteStrings);
            })
          );
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

export const containsComments = (requestData: string) => {
  let insideString = false;
  let prevChar = '';
  for (let i = 0; i < requestData.length; i++) {
    const char = requestData[i];
    const nextChar = requestData[i + 1];

    if (!insideString && char === '"') {
      insideString = true;
    } else if (insideString && char === '"' && prevChar !== '\\') {
      insideString = false;
    } else if (!insideString) {
      if (char === '/' && (nextChar === '/' || nextChar === '*')) {
        return true;
      }
    }

    prevChar = char;
  }

  return false;
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

/**
 * Splits a concatenated string of JSON objects into individual JSON objects.
 *
 * This function takes a string containing one or more JSON objects concatenated together,
 * separated by optional whitespace, and splits them into an array of individual JSON strings.
 * It ensures that nested objects and strings containing braces do not interfere with the splitting logic.
 *
 * Example inputs:
 * - '{ "query": "test"} { "query": "test" }' -> ['{ "query": "test"}', '{ "query": "test" }']
 * - '{ "query": "test"}' -> ['{ "query": "test"}']
 * - '{ "query": "{a} {b}"}' -> ['{ "query": "{a} {b}"}']
 *
 */
const splitDataIntoJsonObjects = (dataString: string): string[] => {
  const jsonObjects = [];
  // Tracks the depth of nested braces
  let depth = 0;
  // Holds the current JSON object as we iterate
  let currentObject = '';
  // Tracks whether the current position is inside a string
  let insideString = false;
  // Tracks whether the current position is inside a triple-quote string
  let insideTripleQuoteString = false;

  let i = 0;
  // Iterate through each character in the input string
  while (i < dataString.length) {
    const char = dataString[i];
    // Append the character to the current JSON object string
    currentObject += char;

    if (char === '"' && dataString.substring(i + 1, i + 3) === '""') {
      // If the character is a quote and the next two characters are also quotes,
      // toggle the `insideString` state
      insideTripleQuoteString = !insideTripleQuoteString;
      currentObject += '""';
      // Skip the next two quotes
      i += 2;
    } else if (!insideTripleQuoteString && char === '"' && dataString[i - 1] !== '\\') {
      // If the character is a quote, it is not escaped, and it's not inside a triple-quote string,
      // toggle the `insideString` state
      insideString = !insideString;
    } else if (!insideTripleQuoteString && !insideString) {
      // Only modify depth if not inside a string

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      }

      // If depth is zero, we have completed a JSON object
      if (depth === 0) {
        jsonObjects.push(currentObject.trim());
        currentObject = '';
      }
    }
    i++;
  }

  // If there's remaining data in currentObject, add it as the last JSON object
  if (currentObject.trim()) {
    jsonObjects.push(currentObject.trim());
  }

  // Filter out any empty strings from the result array
  return jsonObjects.filter((obj) => obj !== '');
};

const cleanUpWhitespaces = (line: string): string => {
  return line.trim().replaceAll(/\s+/g, ' ');
};
