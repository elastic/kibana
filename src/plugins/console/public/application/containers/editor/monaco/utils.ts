/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco, ParsedRequest } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { getTopLevelUrlCompleteComponents } from '../../../../lib/kb';
import { AutoCompleteContext } from '../../../../lib/autocomplete/types';
import { constructUrl } from '../../../../lib/es';
import type { DevToolsVariable } from '../../../components';
import { EditorRequest } from './monaco_editor_actions_provider';
import { MetricsTracker } from '../../../../types';
import { populateContext } from '../../../../lib/autocomplete/engine';

const whitespacesRegex = /\s+/;
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
  return { url, method, data: data ?? [] };
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
  { method, url, data }: EditorRequest,
  variables: DevToolsVariable[]
): EditorRequest => {
  return {
    method,
    url: replaceVariables(url, variables),
    data: data.map((dataObject) => replaceVariables(dataObject, variables)),
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
 * This function returns an array of suggestions items for the request method
 */
const methodDetailLabel = i18n.translate('console.autocompleteSuggestions.methodLabel', {
  defaultMessage: 'method',
});
const autocompleteMethods = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'PATCH'];
export const getMethodCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem[] => {
  // get the word before suggestions to replace when selecting a suggestion from the list
  const wordUntilPosition = model.getWordUntilPosition(position);
  return autocompleteMethods.map((method) => ({
    label: method,
    insertText: method,
    detail: methodDetailLabel,
    // only used to configure the icon
    kind: monaco.languages.CompletionItemKind.Constant,
    range: {
      // replace the whole word with the suggestion
      startColumn: wordUntilPosition.startColumn,
      startLineNumber: position.lineNumber,
      endColumn: position.column,
      endLineNumber: position.lineNumber,
    },
  }));
};

/*
 * This function splits a string on whitespaces and returns its parts as an array
 */
export const getLineTokens = (lineContent: string): string[] => {
  return lineContent.split(whitespacesRegex);
};

/*
 * This function checks if the url contains url params
 */
const questionMarkRegex = /\?/;
export const containsUrlParams = (lineContent: string): boolean => {
  return questionMarkRegex.test(lineContent);
};

/*
 * This function splits the input into a method and an url.
 * The url is split into parts and all except the last part is put into urlTokenPath
 */
export const getMethodAndUrlTokenPath = (
  lineContent: string
): { method: string; urlTokenPath: string[] } => {
  const lineTokens = getLineTokens(lineContent);
  const method = lineTokens[0];
  const url = lineTokens[1];
  const urlParts = url ? url.split(urlPartsSeparatorRegex) : [];
  // remove the last url part
  urlParts.pop();
  return { method, urlTokenPath: urlParts };
};

export const populateContextForMethodAndUrl = (method: string, urlTokenPath: string[]) => {
  // get autocomplete components for the request method
  const components = getTopLevelUrlCompleteComponents(method);
  // this object will contain the information later, it needs to be initialized with some data
  // similar to the old ace editor context
  const context: AutoCompleteContext = {
    method,
    urlTokenPath,
  };

  // mutate the context object and put the autocomplete information there
  populateContext(urlTokenPath, context, undefined, true, components);

  return context;
};

export const getUrlPathCompletionItemsFromContext = (
  context: AutoCompleteContext,
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem[] => {
  const autoCompleteSet = context.autoCompleteSet;
  // TODO the word doesn't include a dot
  const wordUntilPosition = model.getWordUntilPosition(position);
  if (autoCompleteSet && autoCompleteSet.length > 0) {
    return (
      autoCompleteSet
        // filter autocomplete items without a name
        .filter(({ name }) => Boolean(name))
        // map autocomplete items to completion items
        .map((item) => {
          return {
            label: item.name!,
            insertText: item.name!,
            detail: item.meta ?? 'endpoint',
            // the kind is only used to configure the icon
            kind: monaco.languages.CompletionItemKind.Constant,
            range: {
              startLineNumber: position.lineNumber,
              // replace the whole word with the suggestion
              startColumn: wordUntilPosition.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          };
        })
    );
  }
  return [];
};
