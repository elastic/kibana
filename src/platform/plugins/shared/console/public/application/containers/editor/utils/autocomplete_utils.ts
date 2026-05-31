/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { MonacoEditorActionsProvider } from '../monaco_editor_actions_provider';
import {
  getEndpointBodyCompleteComponents,
  getGlobalAutocompleteComponents,
  getKibanaEndpointMethods,
  getKibanaTopLevelUrlCompleteComponents,
  getTopLevelUrlCompleteComponents,
  getUnmatchedEndpointComponents,
} from '../../../../lib/kb';
import { KIBANA_API_PREFIX } from '../../../../../common/constants';
import type { AutoCompleteContext, ResultTerm } from '../../../../lib/autocomplete/types';
import { type DataAutoCompleteRulesOneOf } from '../../../../lib/autocomplete/types';
import { populateContext } from '../../../../lib/autocomplete/engine';
import type { EditorRequest } from '../types';
import { parseBody, parseLine, parseUrl } from './tokens_utils';
import { isRecord } from '../../../../../common/utils/record_utils';
import {
  END_OF_URL_TOKEN,
  i18nTexts,
  methodWhitespaceRegex,
  methodWithKibanaUrlRegex,
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
 * This function returns an array of completion items for the request method.
 *
 * The order is deliberate: Monaco sorts completion items by `sortText` and
 * falls back to alphabetical label sorting, which would otherwise put DELETE
 * first (#259251). GET is the safest verb to accept by default and DELETE
 * the most destructive, so we pin GET first and DELETE last.
 */
const autocompleteMethods = ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE'];

/*
 * Formats the HTTP methods a route supports for display in a suggestion's detail,
 * normalized to uppercase and ordered using the same canonical verb order as the
 * method autocomplete (e.g. `['POST', 'GET']` -> `GET POST`).
 */
const formatSupportedMethods = (methods: string[]): string => {
  const rank = (method: string) => {
    const index = autocompleteMethods.indexOf(method);
    return index === -1 ? autocompleteMethods.length : index;
  };
  return [...new Set(methods.map((method) => method.toUpperCase()))]
    .sort((a, b) => rank(a) - rank(b))
    .join(' ');
};
export const getMethodCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem[] => {
  // get the word before suggestions to replace when selecting a suggestion from the list
  const wordUntilPosition = model.getWordUntilPosition(position);
  return autocompleteMethods.map((method, index) => ({
    label: method,
    insertText: method,
    detail: i18nTexts.method,
    // only used to configure the icon
    kind: monaco.languages.CompletionItemKind.Constant,
    sortText: String(index),
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
 * Whether the given token marks the request as targeting the Kibana API, i.e. it
 * starts with the `kbn:` prefix. The prefix can either be its own token
 * (`kbn:/api/...` -> `kbn:`) or fused with the first path segment
 * (`kbn:api/...` -> `kbn:api`).
 */
const startsWithKibanaApiPrefix = (token: string | undefined): boolean =>
  typeof token === 'string' && token.startsWith(KIBANA_API_PREFIX);

/*
 * Removes the `kbn:` prefix from the url path tokens so they can be matched
 * against the Kibana API definitions (which are stored without the prefix).
 * Handles both `kbn:` as a standalone token and `kbn:` fused with the first
 * segment.
 */
const stripKibanaApiPrefix = (urlPathTokens: string[]): string[] => {
  if (urlPathTokens.length === 0) {
    return urlPathTokens;
  }
  const [first, ...rest] = urlPathTokens;
  const strippedFirst = first.slice(KIBANA_API_PREFIX.length);
  return strippedFirst ? [strippedFirst, ...rest] : rest;
};

/*
 * This function initializes the autocomplete context for the provided method and url token path.
 * When the url targets the Kibana API (prefixed with `kbn:`), the Kibana url
 * matcher is used and the prefix is stripped from the token path before matching.
 */
const populateContextForMethodAndUrl = (method: string, urlTokenPath: string[]) => {
  const isKibanaApi = startsWithKibanaApiPrefix(urlTokenPath[0]);
  const tokenPath = isKibanaApi ? stripKibanaApiPrefix(urlTokenPath) : urlTokenPath;
  // get autocomplete components for the request method from the matching source
  const components = isKibanaApi
    ? getKibanaTopLevelUrlCompleteComponents(method)
    : getTopLevelUrlCompleteComponents(method);
  // this object will contain the information later, it needs to be initialized with some data
  // similar to the old ace editor context
  const context: AutoCompleteContext = {
    method,
    urlTokenPath: tokenPath,
  };

  // mutate the context object and put the autocomplete information there
  populateContext(tokenPath, context, undefined, true, components);

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
  // store the partial token for prefix filtering
  let partialToken = '';
  // store already selected indices to exclude from suggestions
  let alreadySelectedIndices: string[] = [];
  // get the method and previous url parts for context
  const { method, urlPathTokens } = parseLine(lineContent);
  // Detect whether we are completing a Kibana API url (prefixed with `kbn:`).
  // The prefix can live in an already-typed token (`kbn:api/...`, `kbn:/api/...`)
  // or in the token currently being typed (`kbn:ap`).
  const endsWithSlash = lineContent.trim().endsWith('/');
  const lastTokenBeingTyped = endsWithSlash ? undefined : urlPathTokens[urlPathTokens.length - 1];
  const isKibanaApi =
    startsWithKibanaApiPrefix(urlPathTokens[0]) || startsWithKibanaApiPrefix(lastTokenBeingTyped);
  // if the line ends with /, then we use all url path tokens for autocomplete suggestions
  // otherwise, we don't use the last token for populating the autocomplete context
  if (!endsWithSlash) {
    const lastToken = urlPathTokens.pop();
    // if the last token contains a comma, only suggest index names (Elasticsearch only)
    if (!isKibanaApi && lastToken?.includes(',')) {
      onlyIndexNames = true;
      // For comma-separated indices, only filter by the part after the last comma
      const parts = lastToken.split(',');
      partialToken = parts.pop() || '';
      // Track already selected indices to exclude from suggestions
      alreadySelectedIndices = parts.filter((part) => part.length > 0);
    } else {
      // Store the partial token for prefix filtering
      partialToken = lastToken || '';
    }
  }
  // The text used for prefix filtering and for the replace range. When the user
  // is typing the very first Kibana segment the `kbn:` prefix is part of the
  // partial token but must stay in place, so only the text after the prefix is
  // completed (e.g. `kbn:ap` -> complete `ap` -> `kbn:api`).
  const completionPrefix = startsWithKibanaApiPrefix(partialToken)
    ? partialToken.slice(KIBANA_API_PREFIX.length)
    : partialToken;

  const tokenPath = isKibanaApi ? stripKibanaApiPrefix(urlPathTokens) : urlPathTokens;
  const components = isKibanaApi
    ? getKibanaTopLevelUrlCompleteComponents(method)
    : getTopLevelUrlCompleteComponents(method);
  const context: AutoCompleteContext = { method, urlTokenPath: tokenPath };
  populateContext(tokenPath, context, undefined, true, components);

  let autoCompleteSet = context.autoCompleteSet ?? [];
  // Advertise the Kibana API entry point at the very start of the url (the first
  // path segment) so users discover that `kbn:`-prefixed routes are completable
  // too. It's added to the candidate set so the existing prefix/index filters
  // below still apply (e.g. it's hidden once an unrelated prefix is typed).
  if (!isKibanaApi && tokenPath.length === 0) {
    autoCompleteSet = [{ name: KIBANA_API_PREFIX, meta: i18nTexts.api }, ...autoCompleteSet];
  }
  // filter out non index names items if needed
  if (onlyIndexNames) {
    autoCompleteSet = autoCompleteSet.filter((term) => term.meta === 'index');
  }
  const range = {
    startLineNumber: lineNumber,
    // replace the partial token with the suggestion
    startColumn: column - completionPrefix.length,
    endLineNumber: lineNumber,
    endColumn: column,
  };
  return (
    filterTermsWithoutName(autoCompleteSet)
      .filter((term) => {
        // Only keep dot-prefixed terms if the user typed a dot
        const isDotPrefixed = typeof term.name === 'string' && term.name.startsWith('.');
        if (isDotPrefixed && !completionPrefix.startsWith('.')) {
          return false;
        }

        // Exclude indices that are already selected in comma-separated list
        if (
          alreadySelectedIndices.length > 0 &&
          typeof term.name === 'string' &&
          alreadySelectedIndices.includes(term.name)
        ) {
          return false;
        }

        // Filter by prefix: only show suggestions that start with what user typed
        if (completionPrefix && typeof term.name === 'string') {
          return term.name.toLowerCase().startsWith(completionPrefix.toLowerCase());
        }

        return true;
      })
      // map autocomplete items to completion items
      .map((item) => {
        // The synthetic Kibana API entry point is pinned to the top of the list
        // and re-opens suggestions on accept, so the Kibana routes appear right
        // after `kbn:` is inserted.
        const isKibanaApiEntryPoint = !isKibanaApi && item.name === KIBANA_API_PREFIX;
        return {
          label: item.name + '',
          insertText: item.name + '',
          // For Kibana routes, surface the HTTP methods the route supports (e.g.
          // `GET POST`) so users can see which verbs are valid before committing
          // to a url. Falls back to the generic `endpoint` label for trunks that
          // don't resolve to a single endpoint.
          detail:
            getKibanaSuggestionDetail(isKibanaApi, tokenPath, item) ??
            item.meta ??
            i18nTexts.endpoint,
          // the kind is only used to configure the icon
          kind: monaco.languages.CompletionItemKind.Constant,
          range,
          ...(isKibanaApiEntryPoint
            ? {
                sortText: '0',
                command: {
                  id: 'editor.action.triggerSuggest',
                  title: i18nTexts.api,
                },
              }
            : {}),
        };
      })
  );
};

/*
 * Resolves the supported HTTP methods for a Kibana url path suggestion. The
 * suggestion name is relative to the already-typed token path, so the two are
 * joined to reconstruct the full route pattern (e.g. `['api', 'spaces']` + `space`
 * -> `api/spaces/space`) before looking the methods up. Returns `undefined` for
 * Elasticsearch suggestions or when the pattern is not a registered endpoint.
 */
const getKibanaSuggestionDetail = (
  isKibanaApi: boolean,
  tokenPath: string[],
  item: ResultTerm
): string | undefined => {
  if (!isKibanaApi || typeof item.name !== 'string') {
    return undefined;
  }
  const pattern = [...tokenPath, item.name].filter(Boolean).join('/');
  const methods = getKibanaEndpointMethods(pattern);
  return methods && methods.length > 0 ? formatSupportedMethods(methods) : undefined;
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

  const urlParamsComponents =
    context.endpoint?.paramsAutocomplete.getTopLevelComponents(method) ?? [];

  const currentUrlParamToken = urlParamsTokens.pop();
  // check if we are at the param name or the param value
  const urlParamTokenPath = [];
  // if there are 2 tokens in the current url param, then we have the name and the value of the param
  if (currentUrlParamToken && currentUrlParamToken.length > 1) {
    urlParamTokenPath.push(currentUrlParamToken[0]);
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
  const components = context.endpoint
    ? context.endpoint.bodyAutocompleteRootComponents
    : getUnmatchedEndpointComponents();
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

const getStructuralSnippet = (token: string) => {
  if (token === '{') {
    return '{$0}';
  }
  if (token === '[') {
    return '[$0]';
  }
  return undefined;
};

const usesStructuralSnippet = ({ name }: Pick<ResultTerm, 'name'>): boolean =>
  typeof name === 'string' && getStructuralSnippet(name) !== undefined;

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
  // if the rest of the line is empty or there is only " or ends with closing parentheses
  // then template can be inserted, otherwise only name
  context.addTemplate =
    isEmptyOrDoubleQuote(lineContentAfterPosition) || /^}*$/.test(lineContentAfterPosition);

  // if there is " after the cursor, include it in the insert range
  let endColumn = position.column;

  if (lineContentAfterPosition.startsWith('"')) {
    endColumn = endColumn + 1;
  }
  // Check if we're typing a field name with a trailing dot
  const lineContentBeforePosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  // Check if we're typing a nested field name (contains a dot)
  // This handles both "category." (trailing dot) and "category.keywor" (partial field after dot)
  const quotedFieldWithDotMatch = lineContentBeforePosition.match(/"([^"]*\.[^"]*)$/);
  // Also check for unquoted fields with dots (e.g., index.mode without quotes)
  const unquotedFieldWithDotMatch = lineContentBeforePosition.match(
    /(?:^|[\s{:,\[])([a-zA-Z_][\w]*(?:\.[\w]+)+)$/
  );
  const fieldBeingTyped = quotedFieldWithDotMatch
    ? quotedFieldWithDotMatch[1]
    : unquotedFieldWithDotMatch
    ? unquotedFieldWithDotMatch[1]
    : null;
  const isQuotedField = !!quotedFieldWithDotMatch;
  const bodyContentLines = bodyContentBeforePosition.split('\n');
  const currentContentLine = bodyContentLines[bodyContentLines.length - 1].trim();
  const isInsideQuotedString = hasUnclosedQuote(currentContentLine);

  // Adjust the range start column if we have a field with a dot
  let startColumn = wordUntilPosition.startColumn;
  if (fieldBeingTyped) {
    if (isQuotedField) {
      // Find where the quoted field name starts
      const fieldIndex = lineContentBeforePosition.lastIndexOf('"' + fieldBeingTyped);
      if (fieldIndex >= 0) {
        startColumn = fieldIndex + 2; // +2 to skip the quote and start at the field name
      }
    } else {
      // Find where the unquoted field name starts
      const fieldIndex = lineContentBeforePosition.lastIndexOf(fieldBeingTyped);
      if (fieldIndex >= 0) {
        startColumn = fieldIndex + 1; // +1 because column is 1-indexed
      }
    }
  }

  const range = {
    startLineNumber: position.lineNumber,
    // replace the whole word with the suggestion
    startColumn,
    endLineNumber: position.lineNumber,
    endColumn,
  };

  return (
    filterTermsWithoutName(autocompleteSet)
      // Filter suggestions to only show nested fields when there's a field being typed with a dot
      .filter((item) => {
        if ((isInsideQuotedString || !context.addTemplate) && usesStructuralSnippet(item)) {
          return false;
        }

        if (fieldBeingTyped) {
          // Only show fields that start with what the user has typed so far
          return typeof item.name === 'string' && item.name.startsWith(fieldBeingTyped);
        }
        return true;
      })
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

export const getInsertText = (
  { name, insertValue, template, value }: ResultTerm,
  bodyContent: string,
  context: AutoCompleteContext
): string => {
  if (name === undefined) {
    return '';
  }

  let insertText = '';
  if (typeof name === 'string') {
    const structuralSnippet = getStructuralSnippet(name);
    if (structuralSnippet) {
      insertText = structuralSnippet;
    } else {
      const bodyContentLines = bodyContent.split('\n');
      const currentContentLine = bodyContentLines[bodyContentLines.length - 1].trim();
      if (hasUnclosedQuote(currentContentLine)) {
        // The cursor is after an unmatched quote (e.g. '..."abc', '..."')
        insertText = '';
      } else {
        // The cursor is at the beginning of a field so the insert text should start with a quote
        insertText = '"';
      }
      // insertValue can override the inserted token, but structural tokens are inserted as snippets above
      const insertableName = insertValue && !getStructuralSnippet(insertValue) ? insertValue : name;
      insertText += `${insertableName}"`;
    }
  } else {
    insertText = name + '';
  }

  // check if there is template to add
  const conditionalTemplate = getConditionalTemplate(name, bodyContent, context.endpoint);
  if (conditionalTemplate) {
    template = conditionalTemplate;
  }

  if (template && context.addTemplate) {
    let templateLines;
    const templateRecord = isRecord(template) ? template : {};
    const raw = templateRecord.__raw;
    const templateValue = templateRecord.value;

    if (raw === true && typeof templateValue === 'string') {
      templateLines = templateValue.split(newLineRegex);
    } else {
      templateLines = JSON.stringify(template, null, 2).split(newLineRegex);
    }
    insertText += ': ' + templateLines.join('\n');
  } else if (value === '{') {
    insertText += ': {}';
  } else if (value === '[') {
    insertText += ': []';
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
    // Kibana (`kbn:`) urls re-open suggestions while being edited, not just at
    // path boundaries, so deleting characters mid-segment still surfaces routes.
    methodWithKibanaUrlRegex.test(lineContent) ||
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

export const hasUnclosedQuote = (lineContent: string): boolean => {
  let insideString = false;
  let prevChar = '';
  for (let i = 0; i < lineContent.length; i++) {
    const char = lineContent[i];

    if (!insideString && char === '"') {
      insideString = true;
    } else if (insideString && char === '"' && prevChar !== '\\') {
      insideString = false;
    }

    prevChar = char;
  }

  return insideString;
};
