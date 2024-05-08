/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParsedRequest } from '@kbn/monaco';
import { AutoCompleteContext } from '../../../../lib/autocomplete/types';
import { constructUrl } from '../../../../lib/es';
import type { DevToolsVariable } from '../../../components';
import { EditorRequest } from './monaco_editor_actions_provider';
import { MetricsTracker } from '../../../../types';

const whitespacesRegex = /\s/;
export const removeTrailingWhitespaces = (url: string): string => {
  /*
   * This helper removes any trailing inline comments, for example
   * "_search // comment" -> "_search"
   * Ideally the parser removes those comments initially
   */
  return url.trim().split(whitespacesRegex)[0];
};

export const stringifyRequest = (parsedRequest: ParsedRequest): EditorRequest => {
  const url = removeTrailingWhitespaces(parsedRequest.url);
  const method = parsedRequest.method.toUpperCase();
  const data = parsedRequest.data?.map((parsedData) => JSON.stringify(parsedData, null, 2));
  return { url, method, data: data ?? [], text: parsedRequest.text };
};

const variableTemplateRegex = /\${(\w+)}/g;
const replaceVariables = (text: string, variables: DevToolsVariable[]): string => {
  if (variableTemplateRegex.test(text)) {
    text = text.replaceAll(variableTemplateRegex, (match, key) => {
      const variable = variables.find(({ name }) => name === key);

      return variable?.value ?? match;
    });
  }
  return text;
};
export const replaceRequestVariables = (
  { method, url, data, text }: EditorRequest,
  variables: DevToolsVariable[]
): EditorRequest => {
  return {
    method,
    url: replaceVariables(url, variables),
    data: data.map((dataObject) => replaceVariables(dataObject, variables)),
    text,
  };
};

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
 * This function takes a request url as a string and returns it parts,
 * for example '_search/test' => ['_search', 'test']
 */
const urlPartsSeparatorRegex = /\//;
const endOfUrlToken = '__url_path_end__';
export const tokenizeRequestUrl = (url: string): string[] => {
  const parts = url.split(urlPartsSeparatorRegex);
  // this special token is used to mark the end of the url
  parts.push(endOfUrlToken);
  return parts;
};

/*
 * This function returns a documentation link from the autocomplete endpoint object
 * and replaces the branch in the url with the current version "docLinkVersion"
 */
export const getDocumentationLinkFromAutocompleteContext = (
  { endpoint }: AutoCompleteContext,
  docLinkVersion: string
): string | null => {
  if (endpoint && endpoint.documentation && endpoint.documentation.indexOf('http') !== -1) {
    return endpoint.documentation
      .replace('/master/', `/${docLinkVersion}/`)
      .replace('/current/', `/${docLinkVersion}/`)
      .replace('/{branch}/', `/${docLinkVersion}/`);
  }
  return null;
};

export const isStartOfRequest = (line: string) => {
  const regex = /\s*(GET|POST|PUT|DELETE|HEAD|PATCH|get|post|put|delete|head|patch)\s+.*/g;
  return regex.test(line);
};

const containsComments = (text: string) => {
  return text.indexOf('//') >= 0 || text.indexOf('/*') >= 0;
};

export const getAutoIndentedRequests = (requests: EditorRequest[], textLines: string[]): string => {
  const formattedText: string[] = [];

  if (requests.length < 1) {
    return textLines.join(`\n`);
  }

  let currentLineIndex = 0;
  let currentRequestIndex = 0;

  while (currentLineIndex < textLines.length) {
    if (isStartOfRequest(textLines[currentLineIndex])) {
      // Start of a request
      const request = requests[currentRequestIndex];
      const requestText = request.text;
      const requestLines = requestText.split('\n');

      if (containsComments(requestText)) {
        // If request has comments, add it as it is - without formatting
        // TODO: Format requests with comments
        formattedText.push(...requestLines);
      } else {
        // If no comments, add parsed request - it is already formatted as it is JSON-parsed
        const firstLine = request.method + ' ' + request.url;
        formattedText.push(firstLine);

        if (request.data && request.data.length > 0) {
          formattedText.push(...request.data);
        }
      }

      currentLineIndex = currentLineIndex + requestLines.length;
      currentRequestIndex++;
    } else {
      // Current line is a comment or whitespaces
      // Add it to the formatted text as it is
      formattedText.push(textLines[currentLineIndex]);
      currentLineIndex++;
    }
  }

  return formattedText.join('\n');
};
