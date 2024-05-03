/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco, ParsedRequest } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import {
  getEndpointBodyCompleteComponents,
  getGlobalAutocompleteComponents,
  getTopLevelUrlCompleteComponents,
  getUnmatchedEndpointComponents,
} from '../../../../lib/kb';
import { AutoCompleteContext, ResultTerm } from '../../../../lib/autocomplete/types';
import { constructUrl } from '../../../../lib/es';
import type { DevToolsVariable } from '../../../components';
import { EditorRequest } from './monaco_editor_actions_provider';
import { MetricsTracker } from '../../../../types';
import { populateContext } from '../../../../lib/autocomplete/engine';

/*
 * Helper constants
 */
const whitespacesRegex = /\s+/;
const newLineRegex = /\n/;
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
const apiDetailLabel = i18n.translate('console.autocompleteSuggestions.apiLabel', {
  defaultMessage: 'API',
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
  return { url, method, data: data ?? [] };
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

/*
 * This function returns an array of completion items for the request body params
 */
export const getBodyCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  requestStartLineNumber: number
): monaco.languages.CompletionItem[] => {
  const { lineNumber, column } = position;

  // get the content on the method+url line
  const lineContent = model.getLineContent(requestStartLineNumber);
  // get the method and previous url parts for context
  const { method, urlPathTokens } = parseLineContent(lineContent);
  urlPathTokens.push(endOfUrlToken);
  const context = populateContextForMethodAndUrl(method, urlPathTokens);

  // get the content of the request body up until this position
  const bodyRange: monaco.IRange = {
    startLineNumber: requestStartLineNumber + 1,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: column,
  };
  const bodyContent = model.getValueInRange(bodyRange);

  const bodyTokenPath = getBodyTokenPath(bodyContent);
  // needed for scope linking + global term resolving
  context.endpointComponentResolver = getEndpointBodyCompleteComponents;
  context.globalComponentResolver = getGlobalAutocompleteComponents;
  let components: unknown;
  if (context.endpoint) {
    components = context.endpoint.bodyAutocompleteRootComponents;
  } else {
    components = getUnmatchedEndpointComponents();
  }
  populateContext(bodyTokenPath, context, undefined, true, components);

  if (context.autoCompleteSet && context.autoCompleteSet.length > 0) {
    const wordUntilPosition = model.getWordUntilPosition(position);
    // if there is " after the cursor, replace it
    let endColumn = position.column;
    const charAfterPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column + 1,
    });
    if (charAfterPosition === '"') {
      endColumn = endColumn + 1;
    }
    const range = {
      startLineNumber: position.lineNumber,
      // replace the whole word with the suggestion
      startColumn: wordUntilPosition.startColumn,
      endLineNumber: position.lineNumber,
      endColumn,
    };
    return (
      context.autoCompleteSet
        // filter autocomplete items without a name
        .filter(({ name }) => Boolean(name))
        // map autocomplete items to completion items
        .map((item) => {
          const suggestion = {
            label: item.name!,
            insertText: getInsertText(item, bodyContent),
            detail: apiDetailLabel,
            // the kind is only used to configure the icon
            kind: monaco.languages.CompletionItemKind.Constant,
            range,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          };
          return suggestion;
        })
    );
  }
  return [];
};

const getInsertText = (
  { name, insertValue, template, value }: ResultTerm,
  bodyContent: string
): string => {
  let insertText = bodyContent.endsWith('"') ? '' : '"';
  if (insertValue && insertValue !== '{' && insertValue !== '[') {
    insertText = `${insertValue}"`;
  } else {
    insertText = `${name}"`;
  }
  // check if there is template to add
  if (template) {
    let templateLines;
    const { __raw, value } = template;
    if (__raw && value) {
      templateLines = value.split(newLineRegex);
    } else {
      templateLines = JSON.stringify(template, null, 2).split(newLineRegex);
    }
    // TODO add correct indentation
    insertText += ': ' + templateLines.join('\n');
  } else if (value === '{') {
    insertText += '{}';
  } else if (value === '[') {
    insertText += '[]';
  }
  return insertText;
};

const isNewLine = (char: string): boolean => {
  return newLineRegex.test(char);
};
const isDoubleQuote = (char: string): boolean => {
  return char === '"';
};
const isColon = (char: string): boolean => {
  return char === ':';
};
const isComma = (char: string): boolean => {
  return char === ',';
};
const isHashChar = (char: string): boolean => {
  return char === '#';
};
const isSlash = (char: string): boolean => {
  return char === '/';
};
const isStar = (char: string): boolean => {
  return char === '*';
};
const isPropertyName = (token: string): boolean => {
  // we only have {, [ or property name in tokens
  return token !== '{' && token !== '[';
};
const isTripleQuote = (char1: string, char2: string, char3: string): boolean => {
  return isDoubleQuote(char1) && isDoubleQuote(char2) && isDoubleQuote(char3);
};
const numberStartRegex = /[-\d]/;
const digitRegex = /[\d]/;
const isNumberStartChar = (char: string): boolean => {
  return numberStartRegex.test(char);
};
const isMinusSign = (char: string): boolean => {
  return char === '-';
};
const isDigit = (char: string): boolean => {
  return digitRegex.test(char);
};
const isDot = (char: string): boolean => {
  return char === '.';
};
const isENotation = (char: string): boolean => {
  return char === 'e' || char === 'E';
};
const isKeywordChar = (char: string): boolean => {
  // null, true or false
  return char === 'n' || char === 't' || char === 'f';
};
export const getBodyTokenPath = (value: string): string[] => {
  let currentToken = '';
  const tokens = [];
  let index = 0;
  let char = value.charAt(index);
  const next = () => {
    index++;
    char = value.charAt(index);
  };
  const peek = (offset: number): string => {
    return value.charAt(index + offset);
  };
  const skipWhitespace = () => {
    while (whitespacesRegex.test(char)) {
      next();
    }
  };
  const skipUntilAfterNewLine = () => {
    while (char && !isNewLine(char)) {
      next();
    }
    // skip the new line
    if (isNewLine(char)) {
      next();
    }
  };
  const skipComments = () => {
    // # comment
    if (isHashChar(char)) {
      // first skip #
      next();
      skipUntilAfterNewLine();
    } else if (
      // // comment
      isSlash(char) &&
      isSlash(peek(1))
    ) {
      // first skip //
      next();
      next();
      skipUntilAfterNewLine();
    } else if (
      // multi line comment starting with /*
      isSlash(char) &&
      isStar(peek(1))
    ) {
      next();
      next();
      // skip until closing */ is found
      while (char && !(isStar(char) && isSlash(peek(1)))) {
        next();
      }
      if (isStar(char) && isSlash(peek(1))) {
        next();
        next();
      } else {
        throw new Error('Not able to parse multi-line comment');
      }
    }
  };
  const parseString = () => {
    // first check if it's a triple quote
    if (isTripleQuote(char, peek(1), peek(2))) {
      // skip the opening triple quote
      next();
      next();
      next();
      // skip to the next triple quote
      while (char && !isTripleQuote(char, peek(1), peek(2))) {
        next();
      }
      if (isTripleQuote(char, peek(1), peek(2))) {
        // skip the closing triple quote
        next();
        next();
        next();
      } else {
        throw new Error('Missing closing triple quote');
      }
    } else if (isDoubleQuote(char)) {
      // skip the opening double quote
      next();
      while (char && !isDoubleQuote(char)) {
        next();
      }
      if (isDoubleQuote(char)) {
        // skip the closing double quote
        next();
      } else {
        throw new Error('Missing closing double quote');
      }
    } else {
      throw new Error('Not able to parse as string');
    }
  };
  const parseNumber = () => {
    // check the first char
    if (!isNumberStartChar(char)) {
      throw new Error('Not able to parse as number');
    }
    if (isMinusSign(char)) {
      next();
    }
    // check that there is at least 1 digit
    if (!isDigit(char)) {
      throw new Error('Not able to parse as number');
    }
    // skip digits
    while (isDigit(char)) {
      next();
    }
    // optionally there is a dot
    if (isDot(char)) {
      next();
      // needs at least 1 digit after the dot
      if (!isDigit(char)) {
        throw new Error('Missing digits after a dot');
      }
      while (isDigit(char)) {
        next();
      }
    }
    // optionally there is E notation
    if (isENotation(char)) {
      next();
      // needs at least 1 digit after e or E
      if (!isDigit(char)) {
        throw new Error('Missing digits after E notation');
      }
      while (isDigit(char)) {
        next();
      }
    }
    // number parsing is complete
  };
  const parseKeyword = () => {
    switch (char) {
      case 'n': {
        if (peek(1) === 'u' && peek(2) === 'l' && peek(3) === 'l') {
          next();
          next();
          next();
          next();
        } else {
          throw new Error('Not able to parse as null');
        }
        break;
      }
      case 't': {
        if (peek(1) === 'r' && peek(2) === 'u' && peek(3) === 'e') {
          next();
          next();
          next();
          next();
        } else {
          throw new Error('Not able to parse as true');
        }
        break;
      }
      case 'f': {
        if (peek(1) === 'a' && peek(2) === 'l' && peek(3) === 's' && peek(3) === 'e') {
          next();
          next();
          next();
          next();
          next();
        } else {
          throw new Error('Not able to parse as false');
        }
        break;
      }
      default: {
        throw new Error('Not able to parse as null, true or false');
      }
    }
  };
  const parsePropertyName = () => {
    if (!isDoubleQuote(char)) {
      throw new Error('Missing " at the start of string');
    }
    next();
    let propertyName = '';
    while (char && !isDoubleQuote(char)) {
      propertyName = propertyName + char;
      next();
    }
    if (!isDoubleQuote(char)) {
      throw new Error('Missing " at the end of string');
    }
    next();
    if (!propertyName) {
      throw new Error('Empty string used as property name');
    }
    return propertyName;
  };

  try {
    while (char) {
      // the value in currentToken determines the state of the parser
      if (!currentToken) {
        // the start of the object
        skipWhitespace();
        skipComments();
        // look for opening curly bracket
        if (char === '{') {
          tokens.push(char);
          currentToken = char;
          next();
        } else {
          throw new Error('Missing { at object start');
        }
      } else if (
        // inside an object
        currentToken === '{'
      ) {
        skipWhitespace();
        skipComments();
        // inspect the current char: expecting a property name or a closing }
        if (isDoubleQuote(char)) {
          // property name: parse the string and add to tokens
          const propertyName = parsePropertyName();
          // allow whitespace
          skipWhitespace();
          // expecting a colon, otherwise the parser fails
          if (!isColon(char)) {
            throw new Error('Not able to parse');
          }
          // add the property name to the tokens
          tokens.push(propertyName);
          currentToken = propertyName;
          next();
        } else if (char === '}') {
          // empty object: remove the corresponding opening { from tokens
          tokens.pop();
          currentToken = tokens[tokens.length - 1];
          next();
          skipWhitespace();
          // check if the empty object was used as a property value
          if (isPropertyName(currentToken)) {
            // expecting a comma, otherwise the parser fails
            if (!isComma(char)) {
              throw new Error('Not able to parse');
            }
            // after finding the comma, the property value is parsed, the property name can be removed from scope
            tokens.pop();
            currentToken = tokens[tokens.length - 1];
            next();
          }
        } else {
          throw new Error('Not able to parse');
        }
      } else if (
        // inside an array
        currentToken === '['
      ) {
        skipWhitespace();
        skipComments();

        // inspect the current char: expect a closing ] or a valid value
        if (char === ']') {
          // an empty array
          tokens.pop();
          currentToken = tokens[tokens.length - 1];
          next();
          skipWhitespace();
          // check if empty array was used as a property value
          if (isPropertyName(currentToken)) {
            // expecting a comma, otherwise the parser fails
            if (!isComma(char)) {
              throw new Error('Not able to parse');
            }
            // after finding the comma, the property value is parsed, the property name can be removed from scope
            tokens.pop();
            currentToken = tokens[tokens.length - 1];
            next();
          }
        } else {
          // parsing array items

          // object or array: add to tokens
          if (char === '{' || char === '[') {
            tokens.push(char);
            currentToken = char;
            next();
          } else {
            // simple values
            if (isDoubleQuote(char)) {
              parseString();
            } else if (isNumberStartChar(char)) {
              parseNumber();
            } else if (isKeywordChar(char)) {
              parseKeyword();
            } else {
              throw new Error('Not able to parse');
            }
            // after parsing a simple value, expect a comma or a closing ]
            if (isComma(char)) {
              next();
            } else if (char === ']') {
              tokens.pop();
              currentToken = tokens[tokens.length - 1];
              next();
              skipWhitespace();
              // check if empty array was used as a property value
              if (isPropertyName(currentToken)) {
                // expecting a comma, otherwise the parser fails
                if (!isComma(char)) {
                  throw new Error('Not able to parse');
                }
                // after finding the comma, the property value is parsed, the property name can be removed from scope
                tokens.pop();
                currentToken = tokens[tokens.length - 1];
                next();
              }
            }
          }
        }
      } else if (
        // parsing property value
        isPropertyName(currentToken)
      ) {
        skipWhitespace();
        skipComments();
        if (char === '{' || char === '[') {
          tokens.push(char);
          currentToken = char;
          next();
        } else {
          // simple values
          if (isDoubleQuote(char)) {
            parseString();
          } else if (isNumberStartChar(char)) {
            parseNumber();
          } else if (isKeywordChar(char)) {
            parseKeyword();
          } else {
            throw new Error('Not able to parse');
          }
          // after parsing a simple value, expect a comma
          if (!isComma(char)) {
            throw new Error('Not able to parse');
          }
          // after comma, this property name is parsed and can be removed from tokens
          tokens.pop();
          currentToken = tokens[tokens.length - 1];
          next();
        }
      } else {
        throw new Error('Not able to parse');
      }
    }
    return tokens;
  } catch (e) {
    return tokens;
  }
};
