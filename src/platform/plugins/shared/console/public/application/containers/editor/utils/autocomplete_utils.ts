/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import {
  getLineRemainderWithoutConsoleComments,
  isEscaped,
  isInsideConsoleString,
} from '@kbn/monaco/src/languages/console/utils';
import type { MonacoEditorActionsProvider } from '../monaco_editor_actions_provider';
import {
  getEndpointBodyCompleteComponents,
  getGlobalAutocompleteComponents,
  getTopLevelUrlCompleteComponents,
  getUnmatchedEndpointComponents,
} from '../../../../lib/kb';
import type { AutoCompleteContext, ResultTerm } from '../../../../lib/autocomplete/types';
import { type DataAutoCompleteRulesOneOf } from '../../../../lib/autocomplete/types';
import { populateContext } from '../../../../lib/autocomplete/engine';
import type { EditorRequest } from '../types';
import { parseBody, parseLine, parseUrl } from './tokens_utils';
import { isRecord } from '../../../../../common/utils/record_utils';
import {
  END_OF_URL_TOKEN,
  i18nTexts,
  lineEndsWithBodyContinuationRegex,
  methodWhitespaceRegex,
  methodWithUrlRegex,
  newLineRegex,
  onlyBodyClosingTokensRegex,
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
export const getMethodCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem[] => {
  // Replace the whole method even when the cursor is at its start or in its middle.
  const wordAtPosition = model.getWordAtPosition(position);
  const startColumn = wordAtPosition?.startColumn ?? position.column;
  const endColumn = wordAtPosition?.endColumn ?? position.column;
  return autocompleteMethods.map((method, index) => ({
    label: method,
    insertText: method,
    detail: i18nTexts.method,
    // only used to configure the icon
    kind: monaco.languages.CompletionItemKind.Constant,
    sortText: String(index),
    range: {
      // replace the whole word with the suggestion
      startColumn,
      startLineNumber: position.lineNumber,
      endColumn,
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

// Line content from the request start (`requestStartColumn` skips a block-comment prefix such as
// `/* note */ GET _search`, so `parseLine` sees the method first) up to the cursor.
const getRequestLineContentBeforePosition = (
  model: monaco.editor.ITextModel,
  { lineNumber, column }: monaco.Position,
  requestStartColumn: number
): string =>
  model.getValueInRange({
    startLineNumber: lineNumber,
    startColumn: Math.min(requestStartColumn, column),
    endLineNumber: lineNumber,
    endColumn: column,
  });

/*
 * This function returns an array of completion items for the request method and the url path
 */
export const getUrlPathCompletionItems = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  requestStartColumn = 1
): monaco.languages.CompletionItem[] => {
  const { lineNumber, column } = position;
  const lineContent = getRequestLineContentBeforePosition(model, position, requestStartColumn);

  // flag to only suggest index names
  let onlyIndexNames = false;
  // store the partial token for prefix filtering
  let partialToken = '';
  // store already selected indices to exclude from suggestions
  let alreadySelectedIndices: string[] = [];
  // get the method and previous url parts for context
  const { method, urlPathTokens } = parseLine(lineContent);
  // if the line ends with /, then we use all url path tokens for autocomplete suggestions
  // otherwise, we don't use the last token for populating the autocomplete context
  if (!lineContent.trim().endsWith('/')) {
    const lastToken = urlPathTokens.pop();
    // if the last token contains a comma, only suggest index names
    if (lastToken?.includes(',')) {
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
  let { autoCompleteSet } = populateContextForMethodAndUrl(method, urlPathTokens);
  autoCompleteSet = autoCompleteSet ?? [];
  // filter out non index names items if needed
  if (onlyIndexNames) {
    autoCompleteSet = autoCompleteSet.filter((term) => term.meta === 'index');
  }
  const range = {
    startLineNumber: lineNumber,
    // replace the partial token with the suggestion
    startColumn: column - partialToken.length,
    endLineNumber: lineNumber,
    endColumn: column,
  };
  return (
    filterTermsWithoutName(autoCompleteSet)
      .filter((term) => {
        // Only keep dot-prefixed terms if the user typed a dot
        const isDotPrefixed = typeof term.name === 'string' && term.name.startsWith('.');
        if (isDotPrefixed && !partialToken.startsWith('.')) {
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
        if (partialToken && typeof term.name === 'string') {
          return term.name.toLowerCase().startsWith(partialToken.toLowerCase());
        }

        return true;
      })
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
  position: monaco.Position,
  requestStartColumn = 1
): monaco.languages.CompletionItem[] => {
  const lineContent = getRequestLineContentBeforePosition(model, position, requestStartColumn);

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
interface BodyCompletionOptions {
  isInsideTripleQuotedString?: boolean;
}

export const getBodyCompletionItems = async (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  requestStartLineNumber: number,
  editor: MonacoEditorActionsProvider,
  // Column where the request starts on its first line; skips a block-comment prefix
  // (e.g. `/* note */ GET _search`) so `parseLine` sees the method first.
  requestStartColumn = 1,
  { isInsideTripleQuotedString = false }: BodyCompletionOptions = {}
): Promise<monaco.languages.CompletionItem[]> => {
  const { lineNumber, column } = position;

  // get the content on the method+url line, starting at the request itself
  const lineContent = model.getLineContent(requestStartLineNumber).slice(requestStartColumn - 1);
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
    return getSuggestions(
      model,
      position,
      results,
      context,
      bodyContentBeforePosition,
      bodyTokens,
      isInsideTripleQuotedString
    );
  }
  return getSuggestions(
    model,
    position,
    context.autoCompleteSet ?? [],
    context,
    bodyContentBeforePosition,
    bodyTokens,
    isInsideTripleQuotedString
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

const findUnescapedQuoteIndex = (
  lineContentBeforePosition: string,
  lineContentAfterPosition: string
): number => {
  const lineContent = lineContentBeforePosition + lineContentAfterPosition;
  const positionIndex = lineContentBeforePosition.length;
  for (let index = positionIndex; index < lineContent.length; index++) {
    if (lineContent[index] === '"' && !isEscaped(lineContent, index)) {
      return index - positionIndex;
    }
  }
  return -1;
};

const findOpeningQuoteStartColumn = (lineContentBeforePosition: string): number | undefined => {
  for (let index = lineContentBeforePosition.length - 1; index >= 0; index--) {
    if (lineContentBeforePosition[index] === '"' && !isEscaped(lineContentBeforePosition, index)) {
      return index + 1;
    }
  }
};

// Matches the boundary before a JSON value, e.g. the space before `-1` in `"value": -1`.
const JSON_VALUE_BOUNDARY_PATTERN = String.raw`(?:^|[\s:[,])`;
// Matches a complete or partial decimal, e.g. `12`, `0.`, or `.5`.
const DECIMAL_PREFIX_PATTERN = String.raw`(?:\d+(?:\.\d*)?|\.\d*)`;
// Matches an optional partial exponent, e.g. `e`, `e-`, or `E+2`.
const OPTIONAL_EXPONENT_PREFIX_PATTERN = String.raw`(?:[eE][+-]?\d*)?`;
// Matches a signed decimal and optional exponent, e.g. `-1e-` or `0.5`.
const SIGNED_NUMBER_PREFIX_PATTERN = `-?${DECIMAL_PREFIX_PATTERN}${OPTIONAL_EXPONENT_PREFIX_PATTERN}`;
// Captures the trailing primitive prefix, e.g. `1e-` in `"value": 1e-`.
const UNQUOTED_PRIMITIVE_PREFIX_PATTERN = new RegExp(
  `${JSON_VALUE_BOUNDARY_PATTERN}(${SIGNED_NUMBER_PREFIX_PATTERN}|-)$`
);

const findUnquotedPrimitiveValueStartColumn = (
  lineContentBeforePosition: string
): number | undefined => {
  const primitivePrefixMatch = lineContentBeforePosition.match(UNQUOTED_PRIMITIVE_PREFIX_PATTERN);
  const primitivePrefix = primitivePrefixMatch?.[1];
  return primitivePrefix
    ? lineContentBeforePosition.length - primitivePrefix.length + 1
    : undefined;
};

const isCompletingObjectKey = (bodyTokens: string[]): boolean => bodyTokens.at(-1) === '{';

type QuoteSite =
  | { kind: 'unquoted' }
  | { kind: 'sameLineQuoted'; openingQuoteStartColumn: number }
  | { kind: 'multilineQuoted' };

type CompletionSite =
  | { kind: 'objectKey'; quote: QuoteSite }
  | { kind: 'unquotedValue'; primitiveValueStartColumn?: number }
  | {
      kind: 'sameLineQuotedValue';
      openingQuoteStartColumn: number;
      quoteKind: 'regular' | 'triple';
    }
  | { kind: 'multilineQuotedValue'; quoteKind: 'regular' | 'triple' };

const getQuoteSite = (
  lineContentBeforePosition: string,
  isInsideQuotedString: boolean
): QuoteSite => {
  if (!isInsideQuotedString) {
    return { kind: 'unquoted' };
  }

  const openingQuoteStartColumn = findOpeningQuoteStartColumn(lineContentBeforePosition);
  return openingQuoteStartColumn === undefined
    ? { kind: 'multilineQuoted' }
    : { kind: 'sameLineQuoted', openingQuoteStartColumn };
};

const getCompletionSite = (
  lineContentBeforePosition: string,
  bodyTokens: string[],
  isInsideQuotedString: boolean,
  isInsideTripleQuotedString: boolean
): CompletionSite => {
  const quote = getQuoteSite(lineContentBeforePosition, isInsideQuotedString);

  if (isInsideTripleQuotedString) {
    return quote.kind === 'sameLineQuoted'
      ? {
          kind: 'sameLineQuotedValue',
          openingQuoteStartColumn: quote.openingQuoteStartColumn,
          quoteKind: 'triple',
        }
      : { kind: 'multilineQuotedValue', quoteKind: 'triple' };
  }

  if (isCompletingObjectKey(bodyTokens)) {
    return { kind: 'objectKey', quote };
  }

  if (quote.kind === 'unquoted') {
    return {
      kind: 'unquotedValue',
      primitiveValueStartColumn: findUnquotedPrimitiveValueStartColumn(lineContentBeforePosition),
    };
  }

  return quote.kind === 'multilineQuoted'
    ? { kind: 'multilineQuotedValue', quoteKind: 'regular' }
    : {
        kind: 'sameLineQuotedValue',
        openingQuoteStartColumn: quote.openingQuoteStartColumn,
        quoteKind: 'regular',
      };
};

const isObjectKeyCompletionSite = (site: CompletionSite): boolean => site.kind === 'objectKey';

const isQuotedCompletionSite = (site: CompletionSite): boolean =>
  site.kind !== 'unquotedValue' && (site.kind !== 'objectKey' || site.quote.kind !== 'unquoted');

const rejectsPrimitiveTerms = (site: CompletionSite): boolean =>
  (site.kind === 'objectKey' && site.quote.kind === 'multilineQuoted') ||
  site.kind === 'multilineQuotedValue' ||
  (site.kind === 'sameLineQuotedValue' && site.quoteKind === 'triple');

const getOpeningQuoteStartColumn = (site: CompletionSite): number | undefined => {
  if (site.kind === 'sameLineQuotedValue') {
    return site.openingQuoteStartColumn;
  }
  return site.kind === 'objectKey' && site.quote.kind === 'sameLineQuoted'
    ? site.quote.openingQuoteStartColumn
    : undefined;
};

const getSuggestionRange = (
  item: ResultTerm,
  range: monaco.IRange,
  site: CompletionSite
): monaco.IRange => {
  if (typeof item.name === 'string') {
    return site.kind === 'sameLineQuotedValue'
      ? { ...range, startColumn: site.openingQuoteStartColumn + 1 }
      : range;
  }

  const openingQuoteStartColumn = getOpeningQuoteStartColumn(site);
  if (openingQuoteStartColumn !== undefined) {
    return { ...range, startColumn: openingQuoteStartColumn };
  }

  return site.kind === 'unquotedValue' && site.primitiveValueStartColumn !== undefined
    ? { ...range, startColumn: site.primitiveValueStartColumn }
    : range;
};

const getPrimitiveFilterText = (item: ResultTerm, site: CompletionSite): string | undefined => {
  const openingQuoteStartColumn = getOpeningQuoteStartColumn(site);
  return typeof item.name !== 'string' && openingQuoteStartColumn !== undefined
    ? `"${String(item.name)}`
    : undefined;
};

// If there is a closing `"` after the cursor, include it in the replacement range so accepting
// a suggestion replaces the rest of the token instead of duplicating the quote.
const getCompletionEndColumn = (
  positionColumn: number,
  lineContentBeforePosition: string,
  lineContentAfterPosition: string,
  isInsideQuotedString: boolean,
  canInsertTemplate: boolean
): number => {
  const closingQuoteIndex = findUnescapedQuoteIndex(
    lineContentBeforePosition,
    lineContentAfterPosition
  );
  const whitespaceBeforeQuote =
    closingQuoteIndex > 0 && !lineContentAfterPosition.slice(0, closingQuoteIndex).trim();
  const shouldReplaceClosingQuote =
    closingQuoteIndex === 0 ||
    (closingQuoteIndex > 0 &&
      (isInsideQuotedString || (canInsertTemplate && whitespaceBeforeQuote)));

  return shouldReplaceClosingQuote ? positionColumn + closingQuoteIndex + 1 : positionColumn;
};

const getCompletionLineState = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  bodyContentBeforePosition: string
) => {
  const lineContentBeforePosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const lineContentAfterPosition = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: model.getLineMaxColumn(position.lineNumber),
  });
  // Expand templates only when nothing except an auto-closed quote and closing delimiters follows.
  const canInsertTemplate = shouldInsertAutocompleteTemplate(
    getLineRemainderWithoutConsoleComments(bodyContentBeforePosition, lineContentAfterPosition)
  );
  const isInsideQuotedString = isInsideConsoleString(bodyContentBeforePosition);

  return {
    canInsertTemplate,
    isInsideQuotedString,
    lineContentBeforePosition,
    endColumn: getCompletionEndColumn(
      position.column,
      lineContentBeforePosition,
      lineContentAfterPosition,
      isInsideQuotedString,
      canInsertTemplate
    ),
  };
};

const getSuggestions = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  autocompleteSet: ResultTerm[],
  context: AutoCompleteContext,
  bodyContentBeforePosition: string,
  bodyTokens: string[],
  isInsideTripleQuotedString: boolean
) => {
  // get the word before suggestions to replace when selecting a suggestion from the list
  const wordUntilPosition = model.getWordUntilPosition(position);
  const { canInsertTemplate, endColumn, isInsideQuotedString, lineContentBeforePosition } =
    getCompletionLineState(model, position, bodyContentBeforePosition);
  context.addTemplate = canInsertTemplate;
  const completionSite = getCompletionSite(
    lineContentBeforePosition,
    bodyTokens,
    isInsideQuotedString,
    isInsideTripleQuotedString
  );
  // Check if we're typing a field name with a trailing dot
  // Check if we're typing a nested field name (contains a dot)
  // This handles both "category." (trailing dot) and "category.keywor" (partial field after dot)
  const quotedFieldWithDotMatch = isObjectKeyCompletionSite(completionSite)
    ? lineContentBeforePosition.match(/"([^"]*\.[^"]*)$/)
    : null;
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
        if (
          (isQuotedCompletionSite(completionSite) || !context.addTemplate) &&
          usesStructuralSnippet(item)
        ) {
          return false;
        }

        // Bare JSON literals are meaningless inside a triple-quoted ESQL query or a multi-line
        // string continuation whose opening quote is not on this line.
        if (rejectsPrimitiveTerms(completionSite) && typeof item.name !== 'string') {
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
        const insertText = getInsertText(item, bodyContentBeforePosition, context);
        const primitiveFilterText = getPrimitiveFilterText(item, completionSite);
        // When the accepted snippet leaves the cursor inside an empty container,
        // re-open the suggestions widget so the user can keep completing without typing `"`.
        const endsInsideEmptyContainer = insertText.endsWith('{$0}') || insertText.endsWith('[$0]');
        const suggestion: monaco.languages.CompletionItem = {
          // convert name to a string
          label: item.name + '',
          insertText,
          detail: i18nTexts.api,
          // the kind is only used to configure the icon
          kind: monaco.languages.CompletionItemKind.Constant,
          range: getSuggestionRange(item, range, completionSite),
          ...(primitiveFilterText ? { filterText: primitiveFilterText } : {}),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          ...(endsInsideEmptyContainer
            ? { command: { id: 'editor.action.triggerSuggest', title: '' } }
            : {}),
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
      if (isInsideConsoleString(bodyContent)) {
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
  if (conditionalTemplate !== undefined) {
    template = conditionalTemplate;
  }

  if (template !== undefined && template !== null && template !== '' && context.addTemplate) {
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
  name: string | number | boolean,
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
  if (matchedRule && matchedRule.__template !== undefined) {
    return matchedRule.__template;
  }
};

/*
 * Whether the line ends with an object/array opening or comma that is not part of a string.
 */
const endsWithBodyContinuationOutsideString = (
  contentBeforePosition: string,
  insideString = isInsideConsoleString(contentBeforePosition)
): boolean => lineEndsWithBodyContinuationRegex.test(contentBeforePosition) && !insideString;

const autocompleteTriggerPatterns = [
  methodWhitespaceRegex,
  methodWithUrlRegex,
  propertyNameRegex,
  propertyValueRegex,
];

/*
 * This function checks the content of the line before the cursor and decides if the autocomplete
 * suggestions should be triggered
 */
export const shouldTriggerSuggestions = (lineContent: string, insideString?: boolean): boolean =>
  autocompleteTriggerPatterns.some((pattern) => pattern.test(lineContent)) ||
  endsWithBodyContinuationOutsideString(lineContent, insideString);

/*
 * Whether selecting a body suggestion may expand its __template based on
 * the remainder of the line after the cursor.
 */
export const shouldInsertAutocompleteTemplate = (lineContentAfterPosition: string): boolean => {
  return onlyBodyClosingTokensRegex.test(lineContentAfterPosition.trim());
};
