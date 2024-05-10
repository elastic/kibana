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
import { EditorRequest, AdjustedParsedRequest } from './monaco_editor_actions_provider';
import { MetricsTracker } from '../../../../types';
import { populateContext } from '../../../../lib/autocomplete/engine';

/*
 * Helper constants
 */
const whitespacesRegex = /\s+/;
const slashRegex = /\//;
const ampersandRegex = /&/;
const equalsSignRegex = /=/;
const variableTemplateRegex = /\${(\w+)}/g;
const endOfUrlToken = '__url_path_end__';

/*
 * Helper interfaces
 */
export interface ParsedLineTokens {
  method: string;
  urlPathTokens: string[];
  urlParamsTokens: string[][];
}

/*
 * i18n for autocomplete labels
 */
const methodDetailLabel = i18n.translate('console.autocompleteSuggestions.methodLabel', {
  defaultMessage: 'method',
});
const endpointDetailLabel = i18n.translate('console.autocompleteSuggestions.endpointLabel', {
  defaultMessage: 'endpoint',
});
const paramDetailLabel = i18n.translate('console.autocompleteSuggestions.paramLabel', {
  defaultMessage: 'param',
});

/*
 * This functions removes any trailing inline comments, for example
 * "_search // comment" -> "_search"
 * Ideally the parser would do that, but currently they are included in url.
 */
export const removeTrailingWhitespaces = (url: string): string => {
  return url.trim().split(whitespacesRegex)[0];
};

export const stringifyRequest = (parsedRequest: ParsedRequest): EditorRequest => {
  const url = removeTrailingWhitespaces(parsedRequest.url);
  const method = parsedRequest.method.toUpperCase();
  const data = parsedRequest.data?.map((parsedData) => JSON.stringify(parsedData, null, 2));
  return { url, method, data: data ?? [], text: parsedRequest.text };
};

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
 * This function initializes the autocomplete context for the request
 * and returns a documentation link from the endpoint object
 * with the branch in the url replaced by the current version "docLinkVersion"
 */
export const getDocumentationLink = (request: EditorRequest, docLinkVersion: string) => {
  // get the url parts from the request url
  const { urlPathTokens } = parseUrlTokens(request.url);
  // remove the last token, if it's empty
  if (!urlPathTokens[urlPathTokens.length - 1]) {
    urlPathTokens.pop();
  }
  // add the end of url token
  urlPathTokens.push(endOfUrlToken);
  const { endpoint } = populateContextForMethodAndUrl(request.method, urlPathTokens);
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

/*
 * This function takes a list of parsed requests and a string representing the unformatted
 * text from the editor that contains these requests, and returns a text in which
 * the requests are auto-indented.
 */
export const getAutoIndentedRequests = (
  requests: AdjustedParsedRequest[],
  text: string
): string => {
  const textLines = text.split(`\n`);
  const formattedText: string[] = [];

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
        // If no comments, add stringified parsed request
        const stringifiedRequest = stringifyRequest(request);
        const firstLine = stringifiedRequest.method + ' ' + stringifiedRequest.url;
        formattedText.push(firstLine);

        if (stringifiedRequest.data && stringifiedRequest.data.length > 0) {
          formattedText.push(...stringifiedRequest.data);
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
 * This function returns an array of completion items for the request method
 */
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
 * This function initializes the autocomplete context for the provided method and url token path.
 */
const populateContextForMethodAndUrl = (method: string, urlTokenPath: string[]) => {
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

/*
 * This function returns an array of completion items for the request method and the url path
 */
export const getUrlPathCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem[] => {
  const { lineNumber, column } = position;
  // get the content of the line up until the current position
  const lineContent = model.getValueInRange({
    startLineNumber: lineNumber,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: column,
  });

  // get the method and previous url parts for context
  const { method, urlPathTokens } = parseLineContent(lineContent);
  // remove the last token that is either empty if the url has like "_search/" as the last char
  // or it's a word that need to be replaced with autocomplete suggestions like "_search/s"
  urlPathTokens.pop();
  const { autoCompleteSet } = populateContextForMethodAndUrl(method, urlPathTokens);

  const wordUntilPosition = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: position.lineNumber,
    // replace the whole word with the suggestion
    startColumn: lineContent.endsWith('.')
      ? // if there is a dot at the end of the content, it's ignored in the wordUntilPosition
        wordUntilPosition.startColumn - 1
      : wordUntilPosition.startColumn,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  };
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
            detail: item.meta ?? endpointDetailLabel,
            // the kind is only used to configure the icon
            kind: monaco.languages.CompletionItemKind.Constant,
            range,
          };
        })
    );
  }
  return [];
};

/*
 * This function returns an array of completion items for the url params
 */
export const getUrlParamsCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem[] => {
  const { lineNumber, column } = position;
  // get the content of the line up until the current position
  const lineContent = model.getValueInRange({
    startLineNumber: lineNumber,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: column,
  });

  // get the method and previous url parts for context
  const { method, urlPathTokens, urlParamsTokens } = parseLineContent(lineContent);
  urlPathTokens.push(endOfUrlToken);
  const context = populateContextForMethodAndUrl(method, urlPathTokens);

  const urlParamsComponents = context.endpoint?.paramsAutocomplete.getTopLevelComponents(method);

  const currentUrlParamToken = urlParamsTokens.pop();
  // check if we are at the param name or the param value
  const urlParamTokenPath = [];
  // if there are 2 tokens in the current url param, then we have the name and the value of the param
  if (currentUrlParamToken && currentUrlParamToken.length > 1) {
    urlParamTokenPath.push(currentUrlParamToken![0]);
  }

  populateContext(urlParamTokenPath, context, undefined, true, urlParamsComponents);

  if (context.autoCompleteSet && context.autoCompleteSet.length > 0) {
    const wordUntilPosition = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      // replace the whole word with the suggestion
      startColumn: wordUntilPosition.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    };
    return (
      context.autoCompleteSet
        // filter autocomplete items without a name
        .filter(({ name }) => Boolean(name))
        // map autocomplete items to completion items
        .map((item) => {
          return {
            label: item.name!,
            insertText: item.name!,
            detail: item.meta ?? paramDetailLabel,
            // the kind is only used to configure the icon
            kind: monaco.languages.CompletionItemKind.Constant,
            range,
          };
        })
    );
  }
  return [];
};

const parseLineContent = (lineContent: string): ParsedLineTokens => {
  // try to parse into method and url (split on whitespace)
  const parts = lineContent.split(whitespacesRegex);
  // 1st part is the method
  const method = parts[0];
  // 2nd part is the url
  const url = parts[1];
  // try to parse into url path and url params (split on question mark)
  const { urlPathTokens, urlParamsTokens } = parseUrlTokens(url);
  return { method, urlPathTokens, urlParamsTokens };
};

const parseUrlTokens = (
  url: string
): {
  urlPathTokens: ParsedLineTokens['urlPathTokens'];
  urlParamsTokens: ParsedLineTokens['urlParamsTokens'];
} => {
  let urlPathTokens: ParsedLineTokens['urlPathTokens'] = [];
  let urlParamsTokens: ParsedLineTokens['urlParamsTokens'] = [];
  const urlParts = url.split(questionMarkRegex);
  // 1st part is the url path
  const urlPath = urlParts[0];
  // try to parse into url path tokens (split on slash)
  if (urlPath) {
    urlPathTokens = urlPath.split(slashRegex);
  }
  // 2nd part is the url params
  const urlParams = urlParts[1];
  // try to parse into url param tokens
  if (urlParams) {
    urlParamsTokens = urlParams.split(ampersandRegex).map((urlParamsPart) => {
      return urlParamsPart.split(equalsSignRegex);
    });
  }
  return { urlPathTokens, urlParamsTokens };
};
