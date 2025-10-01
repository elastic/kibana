/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLControlVariable, InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import { uniqBy } from 'lodash';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ESQLSingleAstItem, ESQLFunction, ESQLAstItem, ESQLLocation } from '../../../types';
import type {
  ISuggestionItem,
  GetColumnsByTypeFn,
  ICommandContext,
} from '../../../commands_registry/types';
import { Location } from '../../../commands_registry/types';
import { getDateLiterals, getCompatibleLiterals, buildConstantsDefinitions } from '../literals';
import { EDITOR_MARKER } from '../../constants';
import type { FunctionDefinition } from '../../types';
import { type SupportedDataType, isParameterType, FunctionDefinitionTypes } from '../../types';
import { getOverlapRange } from '../shared';
import { argMatchesParamType, getExpressionType } from '../expressions';
import { getColumnByName, isParamExpressionType } from '../shared';
import { getFunctionSuggestions } from '../functions';
import { logicalOperators } from '../../all_operators';
import {
  getOperatorSuggestion,
  getOperatorSuggestions,
  getOperatorsSuggestionsAfterNot,
  getSuggestionsToRightOfOperatorExpression,
} from '../operators';
import { isColumn, isFunctionExpression, isLiteral } from '../../../ast/is';
import { Walker } from '../../../walker';

export const within = (position: number, location: ESQLLocation | undefined) =>
  Boolean(location && location.min <= position && location.max >= position);

export const shouldBeQuotedText = (
  text: string,
  { dashSupported }: { dashSupported?: boolean } = {}
) => {
  return dashSupported ? /[^a-zA-Z\d_\.@-]/.test(text) : /[^a-zA-Z\d_\.@]/.test(text);
};

export const getSafeInsertText = (text: string, options: { dashSupported?: boolean } = {}) => {
  return shouldBeQuotedText(text, options) ? `\`${text.replace(/`/g, '``')}\`` : text;
};

export const buildUserDefinedColumnsDefinitions = (
  userDefinedColumns: string[]
): ISuggestionItem[] =>
  userDefinedColumns.map((label) => ({
    label,
    text: getSafeInsertText(label),
    kind: 'Variable',
    detail: i18n.translate('kbn-esql-ast.esql.autocomplete.variableDefinition', {
      defaultMessage: `Column specified by the user within the ES|QL query`,
    }),
    sortText: 'D',
  }));

export function pushItUpInTheList(suggestions: ISuggestionItem[], shouldPromote: boolean) {
  if (!shouldPromote) {
    return suggestions;
  }
  return suggestions.map(({ sortText, ...rest }) => ({
    ...rest,
    sortText: `1${sortText}`,
  }));
}

export const findFinalWord = (text: string) => {
  const words = text.split(/\s+/);
  return words[words.length - 1];
};

export function findPreviousWord(text: string) {
  const words = text.split(/\s+/);
  return words[words.length - 2];
}

export function withinQuotes(text: string) {
  const quoteCount = (text.match(/"/g) || []).length;
  return quoteCount % 2 === 1;
}

/**
 * This function handles the logic to suggest completions
 * for a given fragment of text in a generic way. A good example is
 * a field name.
 *
 * When typing a field name, there are 2 scenarios
 *
 * 1. field name is incomplete (includes the empty string)
 * KEEP /
 * KEEP fie/
 *
 * 2. field name is complete
 * KEEP field/
 *
 * This function provides a framework for detecting and handling both scenarios in a clean way.
 *
 * @param innerText - the query text before the current cursor position
 * @param isFragmentComplete — return true if the fragment is complete
 * @param getSuggestionsForIncomplete — gets suggestions for an incomplete fragment
 * @param getSuggestionsForComplete - gets suggestions for a complete fragment
 * @returns
 */
export function handleFragment(
  innerText: string,
  isFragmentComplete: (fragment: string) => boolean,
  getSuggestionsForIncomplete: (
    fragment: string,
    rangeToReplace?: { start: number; end: number }
  ) => ISuggestionItem[] | Promise<ISuggestionItem[]>,
  getSuggestionsForComplete: (
    fragment: string,
    rangeToReplace: { start: number; end: number }
  ) => ISuggestionItem[] | Promise<ISuggestionItem[]>
): ISuggestionItem[] | Promise<ISuggestionItem[]> {
  const { fragment, rangeToReplace } = getFragmentData(innerText);
  if (!fragment) {
    return getSuggestionsForIncomplete('');
  } else {
    if (isFragmentComplete(fragment)) {
      return getSuggestionsForComplete(fragment, rangeToReplace);
    } else {
      return getSuggestionsForIncomplete(fragment, rangeToReplace);
    }
  }
}

export function getFragmentData(innerText: string) {
  const fragment = findFinalWord(innerText);
  if (!fragment) {
    return { fragment: '', rangeToReplace: { start: 0, end: 0 } };
  } else {
    const rangeToReplace = {
      start: innerText.length - fragment.length,
      end: innerText.length,
    };
    return { fragment, rangeToReplace };
  }
}

/**
 * TODO — split this into distinct functions, one for fields, one for functions, one for literals
 */
export async function getFieldsOrFunctionsSuggestions(
  types: string[],
  location: Location,
  getFieldsByType: GetColumnsByTypeFn,
  {
    functions,
    columns: fields,
    values = false,
    literals = false,
  }: {
    functions: boolean;
    columns: boolean;
    literals?: boolean;
    values?: boolean;
  },
  {
    ignoreFn = [],
    ignoreColumns = [],
  }: {
    ignoreFn?: string[];
    ignoreColumns?: string[];
  } = {},
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean,
  activeProduct?: PricingProduct
): Promise<ISuggestionItem[]> {
  const filteredFieldsByType = pushItUpInTheList(
    (await (fields
      ? getFieldsByType(types, ignoreColumns, {
          advanceCursor: location === Location.SORT,
          openSuggestions: location === Location.SORT,
          variableType: values ? ESQLVariableType.VALUES : ESQLVariableType.FIELDS,
        })
      : [])) as ISuggestionItem[],
    functions
  );

  // could also be in stats (bucket) but our autocomplete is not great yet
  const displayDateSuggestions =
    types.includes('date') && [Location.WHERE, Location.EVAL].includes(location);

  const suggestions = filteredFieldsByType.concat(
    displayDateSuggestions ? getDateLiterals() : [],
    functions
      ? getFunctionSuggestions(
          {
            location,
            returnTypes: types,
            ignored: ignoreFn,
          },
          hasMinimumLicenseRequired,
          activeProduct
        )
      : [],
    literals ? getCompatibleLiterals(types) : []
  );

  return suggestions;
}

export function getLastNonWhitespaceChar(text: string) {
  return text[text.trimEnd().length - 1];
}

export const columnExists = (col: string, context?: ICommandContext) =>
  Boolean(context ? getColumnByName(col, context) : undefined);

/**
 * The position of the cursor within an expression.
 */
type ExpressionPosition =
  | 'after_column'
  | 'after_function'
  | 'after_not'
  | 'after_operator'
  | 'after_literal'
  | 'empty_expression';

/**
 * Escapes special characters in a string to be used as a literal match in a regular expression.
 * @param {string} text The input string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(text: string): string {
  // Characters with special meaning in regex: . * + ? ^ $ { } ( ) | [ ] \
  // We need to escape all of them. The `$&` in the replacement string means "the matched substring".
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines the position of the cursor within an expression.
 * @param innerText
 * @param expressionRoot
 * @returns
 */
export const getExpressionPosition = (
  innerText: string,
  expressionRoot: ESQLSingleAstItem | undefined
): ExpressionPosition => {
  const endsWithNot = / not$/i.test(innerText.trimEnd());
  if (
    endsWithNot &&
    !(
      expressionRoot &&
      isFunctionExpression(expressionRoot) &&
      // See https://github.com/elastic/kibana/issues/199401
      // for more information on this check...
      ['is null', 'is not null'].includes(expressionRoot.name)
    )
  ) {
    return 'after_not';
  }

  if (expressionRoot) {
    if (
      isColumn(expressionRoot) &&
      // and not directly after the column name or prefix e.g. "colu/"
      // we are escaping the column name here as it may contain special characters such as ??
      !new RegExp(`${escapeRegExp(expressionRoot.parts.join('\\.'))}$`).test(innerText)
    ) {
      return 'after_column';
    }

    if (isFunctionExpression(expressionRoot) && expressionRoot.subtype === 'variadic-call') {
      return 'after_function';
    }

    if (isFunctionExpression(expressionRoot) && expressionRoot.subtype !== 'variadic-call') {
      return 'after_operator';
    }

    if (isLiteral(expressionRoot)) {
      return 'after_literal';
    }
  }

  return 'empty_expression';
};

/**
 * Creates suggestion within an expression.
 *
 * TODO — should this function know about the command context
 * or would we prefer a set of generic configuration options?
 *
 * @param param0
 * @returns
 */
export async function suggestForExpression({
  expressionRoot,
  innerText,
  getColumnsByType: _getColumnsByType,
  location,
  preferredExpressionType,
  context,
  advanceCursorAfterInitialColumn = true,
  hasMinimumLicenseRequired,
  activeProduct,
  ignoredColumnsForEmptyExpression = [],
}: {
  expressionRoot: ESQLSingleAstItem | undefined;
  location: Location;
  preferredExpressionType?: SupportedDataType;
  innerText: string;
  getColumnsByType?: GetColumnsByTypeFn | undefined;
  context?: ICommandContext;
  activeProduct?: PricingProduct;
  advanceCursorAfterInitialColumn?: boolean;
  // @TODO should this be required?
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean;
  // a set of columns not to suggest when the expression is empty
  ignoredColumnsForEmptyExpression?: string[];
}): Promise<ISuggestionItem[]> {
  const getColumnsByType = _getColumnsByType ? _getColumnsByType : () => Promise.resolve([]);

  const suggestions: ISuggestionItem[] = [];

  const position = getExpressionPosition(innerText, expressionRoot);
  switch (position) {
    /**
     * After a literal, column, or complete (non-operator) function call
     */
    case 'after_literal':
    case 'after_column':
    case 'after_function':
      const expressionType = getExpressionType(expressionRoot, context?.columns);

      if (!isParameterType(expressionType)) {
        break;
      }

      suggestions.push(
        ...getOperatorSuggestions(
          {
            location,
            // In case of a param literal, we don't know the type of the left operand
            // so we can only suggest operators that accept any type as a left operand
            leftParamType: isParamExpressionType(expressionType) ? undefined : expressionType,
            ignored: ['='],
            allowed:
              expressionType === 'boolean' && position === 'after_literal'
                ? [
                    ...logicalOperators
                      .filter(({ locationsAvailable }) => locationsAvailable.includes(location))
                      .map(({ name }) => name),
                  ]
                : undefined,
          },
          hasMinimumLicenseRequired,
          activeProduct
        )
      );

      break;

    /**
     * After a NOT keyword
     *
     * the NOT function is a special operator that can be used in different ways,
     * and not all these are mapped within the AST data structure: in particular
     * <COMMAND> <field> NOT <here>
     * is an incomplete statement and it results in a missing AST node, so we need to detect
     * from the query string itself
     *
     * (this comment was copied but seems to still apply)
     */
    case 'after_not':
      if (expressionRoot && isFunctionExpression(expressionRoot) && expressionRoot.name === 'not') {
        suggestions.push(
          ...getFunctionSuggestions(
            { location, returnTypes: ['boolean'] },
            hasMinimumLicenseRequired,
            activeProduct
          ),
          ...(await getColumnsByType('boolean', [], {
            advanceCursor: true,
            openSuggestions: true,
          }))
        );
      } else {
        suggestions.push(...getOperatorsSuggestionsAfterNot());
      }

      break;

    /**
     * After an operator (e.g. AND, OR, IS NULL, +, etc.)
     */
    case 'after_operator':
      if (!expressionRoot) {
        break;
      }

      if (!isFunctionExpression(expressionRoot) || expressionRoot.subtype === 'variadic-call') {
        // this is already guaranteed in the getPosition function, but TypeScript doesn't know
        break;
      }

      let rightmostOperator = expressionRoot;
      // get rightmost function
      const walker = new Walker({
        visitFunction: (fn: ESQLFunction) => {
          if (fn.location.min > rightmostOperator.location.min && fn.subtype !== 'variadic-call')
            rightmostOperator = fn;
        },
      });
      walker.walkFunction(expressionRoot);

      // See https://github.com/elastic/kibana/issues/199401 for an explanation of
      // why this check has to be so convoluted
      if (rightmostOperator.text.toLowerCase().trim().endsWith('null')) {
        suggestions.push(...logicalOperators.map(getOperatorSuggestion));
        break;
      }

      suggestions.push(
        ...(await getSuggestionsToRightOfOperatorExpression({
          queryText: innerText,
          location,
          rootOperator: rightmostOperator,
          preferredExpressionType,
          getExpressionType: (expression) => getExpressionType(expression, context?.columns),
          getColumnsByType,
          hasMinimumLicenseRequired,
          activeProduct,
        }))
      );

      break;

    case 'empty_expression':
      const columnSuggestions: ISuggestionItem[] = await getColumnsByType(
        'any',
        ignoredColumnsForEmptyExpression,
        {
          advanceCursor: advanceCursorAfterInitialColumn,
          openSuggestions: true,
        }
      );
      suggestions.push(
        ...pushItUpInTheList(columnSuggestions, true),
        ...getFunctionSuggestions({ location }, hasMinimumLicenseRequired, activeProduct)
      );

      break;
  }

  /**
   * Attach replacement ranges if there's a prefix.
   *
   * Can't rely on Monaco because
   * - it counts "." as a word separator
   * - it doesn't handle multi-word completions (like "is null")
   *
   * TODO - think about how to generalize this — issue: https://github.com/elastic/kibana/issues/209905
   */
  const hasNonWhitespacePrefix = !/\s/.test(innerText[innerText.length - 1]);
  suggestions.forEach((s) => {
    if (['IS NULL', 'IS NOT NULL'].includes(s.text)) {
      // this suggestion has spaces in it (e.g. "IS NOT NULL")
      // so we need to see if there's an overlap
      s.rangeToReplace = getOverlapRange(innerText, s.text);
      return;
    } else if (hasNonWhitespacePrefix) {
      // get index of first char of final word
      const lastNonWhitespaceIndex = innerText.search(/\S(?=\S*$)/);
      s.rangeToReplace = {
        start: lastNonWhitespaceIndex,
        end: innerText.length,
      };
    }
  });

  return suggestions;
}

export function getControlSuggestion(
  type: ESQLVariableType,
  variables?: string[]
): ISuggestionItem[] {
  return [
    {
      label: i18n.translate('kbn-esql-ast.esql.autocomplete.createControlLabel', {
        defaultMessage: 'Create control',
      }),
      text: '',
      kind: 'Issue',
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.createControlDetailLabel', {
        defaultMessage: 'Click to create',
      }),
      sortText: '1',
      command: {
        id: `esql.control.${type}.create`,
        title: i18n.translate('kbn-esql-ast.esql.autocomplete.createControlDetailLabel', {
          defaultMessage: 'Click to create',
        }),
      },
    } as ISuggestionItem,
    ...(variables?.length
      ? buildConstantsDefinitions(
          variables,
          i18n.translate('kbn-esql-ast.esql.autocomplete.namedParamDefinition', {
            defaultMessage: 'Named parameter',
          }),
          '1A'
        )
      : []),
  ];
}

const getVariablePrefix = (variableType: ESQLVariableType) =>
  variableType === ESQLVariableType.FIELDS || variableType === ESQLVariableType.FUNCTIONS
    ? '??'
    : '?';

export function getControlSuggestionIfSupported(
  supportsControls: boolean,
  type: ESQLVariableType,
  variables?: ESQLControlVariable[],
  shouldBePrefixed = true
) {
  if (!supportsControls) {
    return [];
  }
  const prefix = shouldBePrefixed ? getVariablePrefix(type) : '';
  const filteredVariables = variables?.filter((variable) => variable.type === type) ?? [];
  const controlSuggestion = getControlSuggestion(
    type,
    filteredVariables?.map((v) => `${prefix}${v.key}`)
  );
  return controlSuggestion;
}

function getValidFunctionSignaturesForPreviousArgs(
  fnDefinition: FunctionDefinition,
  enrichedArgs: Array<
    ESQLAstItem & {
      dataType: SupportedDataType | 'unknown';
    }
  >,
  argIndex: number
) {
  // Filter down to signatures that match every params up to the current argIndex
  // e.g. BUCKET(longField, /) => all signatures with first param as long column type
  // or BUCKET(longField, 2, /) => all signatures with (longField, integer, ...)
  const relevantFuncSignatures = fnDefinition.signatures.filter(
    (s) =>
      s.params?.length >= argIndex &&
      s.params
        .slice(0, argIndex)
        .every(({ type: dataType }, idx) =>
          argMatchesParamType(
            enrichedArgs[idx].dataType,
            dataType,
            isLiteral(enrichedArgs[idx]),
            true
          )
        )
  );
  return relevantFuncSignatures;
}

/**
 * Given a function signature, returns the compatible types to suggest for the next argument
 *
 * @param fnDefinition: the function definition
 * @param enrichedArgs: AST args with enriched esType info to match with function signatures
 * @param argIndex: the index of the argument to suggest for
 * @returns
 */
function getCompatibleTypesToSuggestNext(
  fnDefinition: FunctionDefinition,
  enrichedArgs: Array<
    ESQLAstItem & {
      dataType: SupportedDataType | 'unknown';
    }
  >,
  argIndex: number
) {
  // First, narrow down to valid function signatures based on previous arguments
  const relevantFuncSignatures = getValidFunctionSignaturesForPreviousArgs(
    fnDefinition,
    enrichedArgs,
    argIndex
  );

  // Then, get the compatible types to suggest for the next argument
  const compatibleTypesToSuggestForArg = uniqBy(
    relevantFuncSignatures.map((f) => f.params[argIndex]).filter((d) => d),
    (o) => `${o.type}-${o.constantOnly}`
  );
  return compatibleTypesToSuggestForArg;
}

/**
 * Given a function signature, returns the parameter at the given position, even if it's undefined or null
 *
 * @param {params}
 * @param position
 * @returns
 */
function strictlyGetParamAtPosition(
  { params }: FunctionDefinition['signatures'][number],
  position: number
) {
  return params[position] ? params[position] : null;
}

export function getValidSignaturesAndTypesToSuggestNext(
  node: ESQLFunction,
  context: ICommandContext,
  fnDefinition: FunctionDefinition,
  fullText: string,
  offset: number
) {
  const argTypes = node.args.map((arg) => getExpressionType(arg, context?.columns));
  const enrichedArgs = node.args.map((arg, idx) => ({
    ...arg,
    dataType: argTypes[idx],
  })) as Array<
    ESQLAstItem & {
      dataType: SupportedDataType | 'unknown';
    }
  >;

  // pick the type of the next arg
  const shouldGetNextArgument = node.text.includes(EDITOR_MARKER);
  let argIndex = Math.max(node.args.length, 0);
  if (!shouldGetNextArgument && argIndex) {
    argIndex -= 1;
  }

  const validSignatures = getValidFunctionSignaturesForPreviousArgs(
    fnDefinition,
    enrichedArgs,
    argIndex
  );
  // Retrieve unique of types that are compatiable for the current arg
  const typesToSuggestNext = getCompatibleTypesToSuggestNext(fnDefinition, enrichedArgs, argIndex);
  const hasMoreMandatoryArgs = !validSignatures
    // Types available to suggest next after this argument is completed
    .map((signature) => strictlyGetParamAtPosition(signature, argIndex + 1))
    // when a param is null, it means param is optional
    // If there's at least one param that is optional, then
    // no need to suggest comma
    .some((p) => p === null || p?.optional === true);

  // Whether to prepend comma to suggestion string
  // E.g. if true, "fieldName" -> "fieldName, "
  const alreadyHasComma = fullText ? fullText[offset] === ',' : false;
  const shouldAddComma =
    hasMoreMandatoryArgs &&
    fnDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
    !alreadyHasComma;
  const currentArg = enrichedArgs[argIndex];
  return {
    shouldAddComma,
    typesToSuggestNext,
    validSignatures,
    hasMoreMandatoryArgs,
    enrichedArgs,
    argIndex,
    currentArg,
  };
}

export function getLookupIndexCreateSuggestion(
  innerText: string,
  indexName?: string
): ISuggestionItem {
  const start = indexName ? innerText.lastIndexOf(indexName) : -1;
  const rangeToReplace =
    indexName && start !== -1
      ? {
          start,
          end: start + indexName.length,
        }
      : undefined;
  return {
    label: indexName
      ? i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndexWithName',

          {
            defaultMessage: 'Create lookup index "{indexName}"',

            values: { indexName },
          }
        )
      : i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndex', {
          defaultMessage: 'Create lookup index',
        }),

    text: indexName,

    kind: 'Issue',

    filterText: indexName,

    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndexDetailLabel',

      {
        defaultMessage: 'Click to create',
      }
    ),

    sortText: '1A',

    command: {
      id: `esql.lookup_index.create`,

      title: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.createLookupIndexDetailLabel',

        {
          defaultMessage: 'Click to create',
        }
      ),

      arguments: [{ indexName }],
    },

    rangeToReplace,

    incomplete: true,
  } as ISuggestionItem;
}

export function createInferenceEndpointToCompletionItem(
  inferenceEndpoint: InferenceEndpointAutocompleteItem
): ISuggestionItem {
  return {
    detail: i18n.translate('kbn-esql-ast.esql.definitions.rerankInferenceIdDoc', {
      defaultMessage: 'Inference endpoint used for the completion',
    }),
    kind: 'Reference',
    label: inferenceEndpoint.inference_id,
    sortText: '1',
    text: inferenceEndpoint.inference_id,
  };
}

/**
 * Given a suggestion item, decorates it with editor.action.triggerSuggest
 * that triggers the autocomplete dialog again after accepting the suggestion.
 *
 * If the suggestion item already has a custom command, it will preserve it.
 */
export function withAutoSuggest(suggestionItem: ISuggestionItem): ISuggestionItem {
  return {
    ...suggestionItem,
    command: suggestionItem.command
      ? suggestionItem.command
      : {
          title: 'Trigger Suggestion Dialog',
          id: 'editor.action.triggerSuggest',
        },
  };
}
