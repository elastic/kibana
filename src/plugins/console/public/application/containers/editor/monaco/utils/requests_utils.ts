/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco, ParsedRequest } from '@kbn/monaco';
import { constructUrl } from '../../../../../lib/es';
import { MetricsTracker } from '../../../../../types';
import type { DevToolsVariable } from '../../../../components';
import type { EditorRequest } from '../types';
import { variableTemplateRegex } from './constants';
import { removeTrailingWhitespaces } from './tokens_utils';
import { AdjustedParsedRequest } from '../types';

/*
 * This function stringifies and normalizes the parsed request:
 * - the method is converted to upper case
 * - any trailing comments are removed from the url
 * - the request body is stringified from an object using JSON.stringify
 */
export const stringifyRequest = (parsedRequest: ParsedRequest): EditorRequest => {
  const url = parsedRequest.url ? removeTrailingWhitespaces(parsedRequest.url) : '';
  const method = parsedRequest.method?.toUpperCase() ?? '';
  const data = parsedRequest.data?.map((parsedData) => JSON.stringify(parsedData, null, 2));
  return { url, method, data: data ?? [] };
};

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
    url: replaceVariables(url, variables),
    data: data.map((dataObject) => replaceVariables(dataObject, variables)),
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
  if (data.length > 0) {
    curlRequest += ` -H "Content-Type: application/json" -d'\n`;
    curlRequest += data.join('\n');
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
export const getRequestEndLineNumber = (
  parsedRequest: ParsedRequest,
  model: monaco.editor.ITextModel,
  index: number,
  parsedRequests: ParsedRequest[]
): number => {
  let endLineNumber: number;
  if (parsedRequest.endOffset) {
    // if the parser set an end offset for this request, then find the line number for it
    endLineNumber = model.getPositionAt(parsedRequest.endOffset).lineNumber;
  } else {
    // if no end offset, try to find the line before the next request starts
    const nextRequest = parsedRequests.at(index + 1);
    if (nextRequest) {
      const nextRequestStartLine = model.getPositionAt(nextRequest.startOffset).lineNumber;
      endLineNumber = nextRequestStartLine - 1;
    } else {
      // if there is no next request, take the last line of the model
      endLineNumber = model.getLineCount();
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

/*
 * Internal helpers
 */
const replaceVariables = (text: string, variables: DevToolsVariable[]): string => {
  if (variableTemplateRegex.test(text)) {
    text = text.replaceAll(variableTemplateRegex, (match, key) => {
      const variable = variables.find(({ name }) => name === key);

      return variable?.value ?? match;
    });
  }
  return text;
};

const containsComments = (text: string) => {
  return text.indexOf('//') >= 0 || text.indexOf('/*') >= 0;
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

      if (requestLines.some((line) => containsComments(line))) {
        // If request has comments, add it as it is - without formatting
        // TODO: Format requests with comments
        formattedTextLines.push(...requestLines);
      } else {
        // If no comments, add stringified parsed request
        const stringifiedRequest = stringifyRequest(request);
        const firstLine = stringifiedRequest.method + ' ' + stringifiedRequest.url;
        formattedTextLines.push(firstLine);

        if (stringifiedRequest.data && stringifiedRequest.data.length > 0) {
          formattedTextLines.push(...stringifiedRequest.data);
        }
      }

      currentLineIndex = currentLineIndex + requestLines.length;
      currentRequestIndex++;
    } else {
      // Current line is a comment or whitespaces
      // Trim white spaces and add it to the formatted text
      formattedTextLines.push(selectedTextLines[currentLineIndex].trim());
      currentLineIndex++;
    }
  }

  return formattedTextLines.join('\n');
};
