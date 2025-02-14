/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { MonacoEditorActionsProvider } from '../monaco_editor_actions_provider';
import {
  getEndpointBodyCompleteComponents,
  getGlobalAutocompleteComponents,
  getTopLevelUrlCompleteComponents,
  getUnmatchedEndpointComponents,
} from '../../../../lib/kb';
import {
  AutoCompleteContext,
  type DataAutoCompleteRulesOneOf,
  ResultTerm,
} from '../../../../lib/autocomplete/types';
import { populateContext } from '../../../../lib/autocomplete/engine';
import type { EditorRequest } from '../types';
import { parseBody, parseLine, parseUrl } from './tokens_utils';
import {
  END_OF_URL_TOKEN,
  i18nTexts,
  methodWhitespaceRegex,
  methodWithUrlRegex,
  newLineRegex,
  propertyNameRegex,
  propertyValueRegex,
} from './constants';

/*
 * This function initializes the autocomplete context for the request
 * and returns a documentation link from the endpoint object
 * with the branch in the url replaced by the current version "docLinkVersion"
 */
export const getDocumentationLinkFromAutocomplete = (
  request: EditorRequest,
  docLinkVersion: string
) => {
  // get the url parts from the request url
  const { urlPathTokens } = parseUrl(request.url);
  // add the end of url token
  urlPathTokens.push(END_OF_URL_TOKEN);
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
 * Helper function that filters out suggestions without a name.
 */
const filterTermsWithoutName = (terms: ResultTerm[]): ResultTerm[] =>
  terms.filter((term) => term.name !== undefined && term.name !== '');

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
    detail: i18nTexts.method,
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

  // flag to only suggest index names
  let onlyIndexNames = false;
  // get the method and previous url parts for context
  const { method, urlPathTokens } = parseLine(lineContent);
  // if the line ends with /, then we use all url path tokens for autocomplete suggestions
  // otherwise, we don't use the last token for populating the autocomplete context
  if (!lineContent.trim().endsWith('/')) {
    const lastToken = urlPathTokens.pop();
    // if the last token contains a comma, only suggest index names
    if (lastToken?.includes(',')) {
      onlyIndexNames = true;
    }
  }
  let { autoCompleteSet } = populateContextForMethodAndUrl(method, urlPathTokens);
  autoCompleteSet = autoCompleteSet ?? [];
  // filter out non index names items if needed
  if (onlyIndexNames) {
    autoCompleteSet = autoCompleteSet.filter((term) => term.meta === 'index');
  }
  const wordUntilPosition = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: lineNumber,
    // replace the whole word with the suggestion
    startColumn: lineContent.endsWith('.')
      ? // if there is a dot at the end of the content, it's ignored in the wordUntilPosition
        wordUntilPosition.startColumn - 1
      : wordUntilPosition.startColumn,
    endLineNumber: lineNumber,
    endColumn: column,
  };
  return (
    filterTermsWithoutName(autoCompleteSet)
      .filter(
        (term) =>
          // Only keep dot-prefixed terms if the user typed in a dot
          !(typeof term.name === 'string' && term.name.startsWith('.')) ||
          lineContent.trim().endsWith('.')
      )
      // map autocomplete items to completion items
      .map((item) => {
        return {
          label: item.name + '',
          insertText: item.name + '',
          detail: item.meta ?? i18nTexts.endpoint,
          // the kind is only used to configure the icon
          kind: monaco.languages.CompletionItemKind.Constant,
          range,
        };
      })
  );
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
  const { method, urlPathTokens, urlParamsTokens } = parseLine(lineContent);
  urlPathTokens.push(END_OF_URL_TOKEN);
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
      filterTermsWithoutName(context.autoCompleteSet)
        // map autocomplete items to completion items
        .map((item) => {
          return {
            label: item.name + '',
            insertText: item.name + '',
            detail: item.meta ?? i18nTexts.param,
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
 * This function returns an array of completion items for the request body params
 */
export const getBodyCompletionItems = async (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  requestStartLineNumber: number,
  editor: MonacoEditorActionsProvider
): Promise<monaco.languages.CompletionItem[]> => {
  const { lineNumber, column } = position;

  // get the content on the method+url line
  const lineContent = model.getLineContent(requestStartLineNumber);
  // get the method and previous url parts for context
  const { method, urlPathTokens } = parseLine(lineContent);
  urlPathTokens.push(END_OF_URL_TOKEN);
  const context = populateContextForMethodAndUrl(method, urlPathTokens);

  // get the content of the request body up until this position
  const bodyRange: monaco.IRange = {
    startLineNumber: requestStartLineNumber + 1,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: column,
  };
  const bodyContentBeforePosition = model.getValueInRange(bodyRange);

  const bodyTokens = parseBody(bodyContentBeforePosition);
  // needed for scope linking + global term resolving
  context.endpointComponentResolver = getEndpointBodyCompleteComponents;
  context.globalComponentResolver = getGlobalAutocompleteComponents;
  let components: unknown;
  if (context.endpoint) {
    components = context.endpoint.bodyAutocompleteRootComponents;
  } else {
    components = getUnmatchedEndpointComponents();
  }
  context.editor = editor;
  context.requestStartRow = requestStartLineNumber;
  populateContext(bodyTokens, context, editor, true, components);
  if (!context) {
    return [];
  }
  // loading async suggestions
  if (context.asyncResultsState?.isLoading && context.asyncResultsState) {
    const results = await context.asyncResultsState.results;
    return getSuggestions(model, position, results, context, bodyContentBeforePosition);
  }
  return getSuggestions(
    model,
    position,
    context.autoCompleteSet ?? [],
    context,
    bodyContentBeforePosition
  );
};

const getSuggestions = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  autocompleteSet: ResultTerm[],
  context: AutoCompleteContext,
  bodyContentBeforePosition: string
) => {
  const wordUntilPosition = model.getWordUntilPosition(position);
  const lineContentAfterPosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: model.getLineMaxColumn(position.lineNumber),
  });
  // if the rest of the line is empty or there is only "
  // then template can be inserted, otherwise only name
  context.addTemplate = isEmptyOrDoubleQuote(lineContentAfterPosition);

  // if there is " after the cursor, include it in the insert range
  let endColumn = position.column;

  if (lineContentAfterPosition.startsWith('"')) {
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
    filterTermsWithoutName(autocompleteSet)
      // map autocomplete items to completion items
      .map((item) => {
        const suggestion = {
          // convert name to a string
          label: item.name + '',
          insertText: getInsertText(item, bodyContentBeforePosition, context),
          detail: i18nTexts.api,
          // the kind is only used to configure the icon
          kind: monaco.languages.CompletionItemKind.Constant,
          range,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        };
        return suggestion;
      })
  );
};
const getInsertText = (
  { name, insertValue, template, value }: ResultTerm,
  bodyContent: string,
  context: AutoCompleteContext
): string => {
  if (name === undefined) {
    return '';
  }

  // Always create the insert text with the name first, check the end of the body content
  // to decide if we need to add a double quote after the name.
  // This is done to avoid adding a double quote if the user is typing a value after the name.
  let insertText = bodyContent.trim().endsWith('"') ? `${name}"` : `"${name}"`;

  // check if there is template to add
  const conditionalTemplate = getConditionalTemplate(name, bodyContent, context.endpoint);
  if (conditionalTemplate) {
    template = conditionalTemplate;
  }

  if (template) {
    let templateLines;
    const { __raw, value: templateValue } = template;
    if (__raw && templateValue) {
      templateLines = templateValue.split(newLineRegex);
    } else {
      templateLines = JSON.stringify(template, null, 2).split(newLineRegex);
    }
    insertText += ': ' + templateLines.join('\n');
  } else if (value === '{') {
    insertText += ': {$0}';
  } else if (value === '[') {
    insertText += ': [$0]';
  } else if (insertValue && insertValue !== '{' && insertValue !== '[') {
    insertText = `"${insertValue}"`;
    insertText += ': $0';
  } else {
    insertText += ': $0';
  }

  // the string $0 is used to move the cursor between empty curly/square brackets
  if (insertText.endsWith('{}')) {
    insertText = insertText.substring(0, insertText.length - 2) + '{$0}';
  }
  if (insertText.endsWith('[]')) {
    insertText = insertText.substring(0, insertText.length - 2) + '[$0]';
  }
  return insertText;
};

const getConditionalTemplate = (
  name: string | boolean,
  bodyContent: string,
  endpoint: AutoCompleteContext['endpoint']
) => {
  if (typeof name !== 'string' || !endpoint || !endpoint.data_autocomplete_rules) {
    return;
  }
  // get the autocomplete rules for the request body
  const { data_autocomplete_rules: autocompleteRules } = endpoint;
  // get the rules for this property name
  const rules = autocompleteRules[name];
  // check if the rules have "__one_of" property
  if (!rules || typeof rules !== 'object' || !('__one_of' in rules)) {
    return;
  }
  const oneOfRules = rules.__one_of as DataAutoCompleteRulesOneOf[];
  // try to match one of the rules to the body content
  const matchedRule = oneOfRules.find((rule) => {
    if (rule.__condition && rule.__condition.lines_regex) {
      return new RegExp(rule.__condition.lines_regex, 'm').test(bodyContent);
    }
    return false;
  });
  // use the template from the matched rule
  if (matchedRule && matchedRule.__template) {
    return matchedRule.__template;
  }
};

/*
 * This function checks the content of the line before the cursor and decides if the autocomplete
 * suggestions should be triggered
 */
export const shouldTriggerSuggestions = (lineContent: string): boolean => {
  return (
    methodWhitespaceRegex.test(lineContent) ||
    methodWithUrlRegex.test(lineContent) ||
    propertyNameRegex.test(lineContent) ||
    propertyValueRegex.test(lineContent)
  );
};

/*
 * This function checks if the content of the line after the cursor is either empty
 * or it only has a double quote.
 */
export const isEmptyOrDoubleQuote = (lineContent: string): boolean => {
  lineContent = lineContent.trim();
  return !lineContent || lineContent === '"';
};
