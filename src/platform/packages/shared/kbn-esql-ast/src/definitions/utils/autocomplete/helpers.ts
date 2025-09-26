/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ESQLControlVariable, InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { LicenseType } from '@kbn/licensing-types';
import { uniq, uniqBy } from 'lodash';
import { isColumn, isFunctionExpression, isLiteral } from '../../../ast/is';
import { within } from '../../../ast/location';
import type {
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
  ItemKind,
} from '../../../commands_registry/types';
import { Location } from '../../../commands_registry/types';
import type { ESQLAstItem, ESQLColumn, ESQLFunction, ESQLSingleAstItem } from '../../../types';
import { Walker } from '../../../walker';
import { logicalOperators, comparisonFunctions } from '../../all_operators';
import { EDITOR_MARKER, timeUnitsToSuggest, FULL_TEXT_SEARCH_FUNCTIONS } from '../../constants';
import type { FunctionDefinition, FunctionParameterType, Signature } from '../../types';
import {
  isParameterType,
  type SupportedDataType,
  FunctionDefinitionTypes,
  isNumericType,
} from '../../types';
import { argMatchesParamType, getExpressionType } from '../expressions';
import { getFunctionDefinition, getFunctionSuggestions, getAllFunctions } from '../functions';
import { buildConstantsDefinitions, getCompatibleLiterals, getDateLiterals } from '../literals';
import {
  commaCompleteItem,
  allStarConstant,
  listCompleteItem,
} from '../../../commands_registry/complete_items';
import { isList } from '../../../ast/is';
import {
  getOperatorSuggestion,
  getOperatorSuggestions,
  getOperatorsSuggestionsAfterNot,
  getSuggestionsToRightOfOperatorExpression,
} from '../operators';
import { getColumnByName, getOverlapRange, isParamExpressionType } from '../shared';
import { findAstPosition, correctQuerySyntax } from '../ast';
import { parse } from '../../../parser';
import { getLocationInfo } from '../../../commands_registry/location';
import {
  isAggFunctionUsedAlready,
  getFunctionsToIgnoreForStats,
  isTimeseriesAggUsedAlready,
} from './functions';
import type { ESQLCommand, ESQLCommandOption } from '../../../types';
import { buildValueDefinitions } from '../values';

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
  types: (SupportedDataType | 'unknown' | 'any')[],
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
  | 'in_function'
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
      return within(innerText.length, expressionRoot) ? 'in_function' : 'after_function';
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

// ============================================================================
// Main Entry Point
// ============================================================================

interface ResolvedEnv {
  getColumnsByType: GetColumnsByTypeFn;
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean;
  activeProduct?: PricingProduct;
}

export interface FunctionParameterContext {
  paramDefinitions: Signature['params'];
  functionsToIgnore: string[];
  // Flag to suggest comma after function parameters when more mandatory args exist
  hasMoreMandatoryArgs?: boolean;
  // Function definition for function-specific parameter handling (e.g., CASE function)
  functionDefinition?: FunctionDefinition;
}

// Generates autocomplete suggestions for expressions in ES|QL commands
export async function suggestForExpression({
  query,
  expressionRoot,
  command,
  cursorPosition,
  location,
  context,
  callbacks,
  options,
}: {
  query: string;
  expressionRoot: ESQLSingleAstItem | undefined;
  command: ESQLCommand;
  cursorPosition: number;
  location?: Location;
  context: ICommandContext | undefined;
  callbacks: ICommandCallbacks | undefined;
  options?: {
    preferredExpressionType?: SupportedDataType;
    functionParameterContext?: FunctionParameterContext;
    advanceCursorAfterInitialColumn?: boolean;
    ignoredColumnsForEmptyExpression?: string[];
  };
}): Promise<ISuggestionItem[]> {
  // ============================================================================
  // 1. Parameter Extraction & Normalization
  // ============================================================================

  let preferredExpressionType = options?.preferredExpressionType;
  let functionParameterContext = options?.functionParameterContext;
  const advanceCursorAfterInitialColumn = options?.advanceCursorAfterInitialColumn ?? true;
  const ignoredColumnsForEmptyExpression = options?.ignoredColumnsForEmptyExpression ?? [];

  // Normalize inputs across new/legacy API without changing external behavior
  const normalizedParams = normalizeSuggestArgs({
    query,
    command,
    cursorPosition,
    expressionRoot,
    location,
    functionParameterContext,
    preferredExpressionType,
    context,
    callbacks,
    advanceCursorAfterInitialColumn,
    ignoredColumnsForEmptyExpression,
  });
  if (normalizedParams === null) {
    return [];
  }
  const innerText = normalizedParams.innerText ?? '';
  location = normalizedParams.location ?? location;
  expressionRoot = normalizedParams.expressionRoot ?? expressionRoot;
  functionParameterContext = normalizedParams.functionParameterContext ?? functionParameterContext;
  preferredExpressionType = normalizedParams.preferredExpressionType ?? preferredExpressionType;
  context = normalizedParams.context ?? context;
  callbacks = normalizedParams.callbacks ?? callbacks;
  const isCursorFollowedByComma = normalizedParams.isCursorFollowedByComma ?? false;

  // ============================================================================
  // 2. Derive Smart Defaults (Command-Specific Behavior)
  // ============================================================================

  const shouldDerive = !expressionRoot;

  const finalAdvanceCursor =
    advanceCursorAfterInitialColumn !== undefined
      ? advanceCursorAfterInitialColumn
      : normalizedParams.advanceCursorAfterInitialColumn !== undefined
      ? normalizedParams.advanceCursorAfterInitialColumn
      : shouldDerive && location
      ? deriveAdvanceCursor(command, location)
      : true;

  const finalIgnoredColumns =
    ignoredColumnsForEmptyExpression !== undefined
      ? ignoredColumnsForEmptyExpression
      : normalizedParams.ignoredColumnsForEmptyExpression !== undefined
      ? normalizedParams.ignoredColumnsForEmptyExpression
      : shouldDerive && location
      ? deriveIgnoredColumns(command, location)
      : [];

  // ============================================================================
  // 3. Early Returns (Special Cases)
  // ============================================================================

  // Control suggestions for DISSECT/GROK (no location needed)
  if (!location && context?.supportsControls) {
    return getControlSuggestionIfSupported(
      context.supportsControls,
      ESQLVariableType.VALUES,
      context.variables
    );
  }

  // Location required for all other suggestions
  if (!location) {
    return [];
  }

  const definedLocation: Location = location;

  // ============================================================================
  // 4. Setup Environment & Detect Position
  // ============================================================================

  const env: ResolvedEnv = {
    getColumnsByType: (callbacks?.getByType as any) ?? ((..._args: any[]) => Promise.resolve([])),
    hasMinimumLicenseRequired: callbacks?.hasMinimumLicenseRequired,
    activeProduct: context?.activeProduct,
  };

  const position = getExpressionPosition(innerText, expressionRoot);

  // ============================================================================
  // 5. Route to Position-Specific Handlers
  // ============================================================================

  switch (position) {
    // Inside function call - suggest function parameters
    case 'in_function': {
      const functionSuggestions = await handleInFunction({
        innerText,
        expressionRoot,
        context,
        functionParameterContext,
        query,
        command,
        cursorPosition,
        location: definedLocation,
        preferredExpressionType,
        callbacks,
        advanceCursorAfterInitialColumn: finalAdvanceCursor,
        ignoredColumnsForEmptyExpression: finalIgnoredColumns,
      });
      attachRanges(innerText, functionSuggestions);
      return functionSuggestions;
    }

    // After complete expression - suggest operators
    case 'after_literal':
    case 'after_column':
    case 'after_function': {
      const literalSuggestions = await handleAfterLiteralColumnOrFunction({
        expressionRoot,
        position,
        functionParameterContext,
        location: definedLocation,
        context,
        env,
      });
      attachRanges(innerText, literalSuggestions);
      return literalSuggestions;
    }

    // After NOT - suggest operators or boolean expressions
    case 'after_not': {
      const notSuggestions: ISuggestionItem[] = [];
      if (expressionRoot && isFunctionExpression(expressionRoot) && expressionRoot.name === 'not') {
        notSuggestions.push(
          ...getFunctionSuggestions(
            { location: definedLocation, returnTypes: ['boolean'] },
            env.hasMinimumLicenseRequired,
            env.activeProduct
          ),
          ...(await env.getColumnsByType('boolean', [], {
            advanceCursor: true,
            openSuggestions: true,
          }))
        );
      } else {
        notSuggestions.push(...getOperatorsSuggestionsAfterNot());
      }

      attachRanges(innerText, notSuggestions);
      return notSuggestions;
    }

    // After binary/unary operator - suggest right operand
    case 'after_operator':
      if (!expressionRoot) {
        break;
      }
      if (!isFunctionExpression(expressionRoot) || expressionRoot.subtype === 'variadic-call') {
        break;
      }
      const operatorSuggestions = await handleAfterOperator({
        innerText,
        expressionRoot,
        location: definedLocation,
        preferredExpressionType,
        context,
        env,
      });
      attachRanges(innerText, operatorSuggestions);
      return operatorSuggestions;

    // Empty expression - suggest columns, functions, literals
    case 'empty_expression': {
      const emptySuggestions = await handleEmptyExpression({
        functionParameterContext,
        location: definedLocation,
        context,
        env,
        advanceCursorAfterInitialColumn: finalAdvanceCursor,
        ignoredColumnsForEmptyExpression: finalIgnoredColumns,
        isCursorFollowedByComma,
        command,
      });
      attachRanges(innerText, emptySuggestions);
      return emptySuggestions;
    }
  }

  // All cases handled above with early returns
  return [];
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

// Helper to ensure both keyword and text types are present
const ensureKeywordAndText = (types: FunctionParameterType[]) => {
  if (types.includes('keyword') && !types.includes('text')) {
    types.push('text');
  }
  if (types.includes('text') && !types.includes('keyword')) {
    types.push('keyword');
  }
  return types;
};

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
function getCompatibleParamDefs(
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
  fnDefinition: FunctionDefinition
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
  const shouldGetNextArgument = node.text.includes(EDITOR_MARKER); // NOTE: I think this is checking if the cursor is after a comma.
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
  const compatibleParamDefs = getCompatibleParamDefs(fnDefinition, enrichedArgs, argIndex);
  const hasMoreMandatoryArgs = !validSignatures
    // Types available to suggest next after this argument is completed
    .map((signature) => strictlyGetParamAtPosition(signature, argIndex + 1))
    // when a param is null, it means param is optional
    // If there's at least one param that is optional, then
    // no need to suggest comma
    .some((p) => p === null || p?.optional === true);

  return {
    compatibleParamDefs,
    hasMoreMandatoryArgs,
    enrichedArgs,
    argIndex,
  };
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

// ============================================================================
// Helper Functions: Function Parameter Context
// ============================================================================

// Builds function parameter context for suggestions
// Commands with special filtering (like STATS) can extend with command-specific functionsToIgnore
export function buildFunctionParameterContext(
  fn: ESQLFunction,
  context?: ICommandContext
): FunctionParameterContext | null {
  const fnDefinition = getFunctionDefinition(fn.name);

  if (!fnDefinition || !context) {
    return null;
  }

  const validationResult = getValidSignaturesAndTypesToSuggestNext(fn, context, fnDefinition);

  return {
    paramDefinitions: validationResult.compatibleParamDefs,
    functionsToIgnore: [fn.name], // Basic recursion prevention
    hasMoreMandatoryArgs: validationResult.hasMoreMandatoryArgs,
    functionDefinition: fnDefinition,
  };
}

// Extracted handler: logic for suggestions when inside a function parameter context
async function handleInFunction({
  innerText,
  expressionRoot,
  context,
  functionParameterContext,
  query,
  command,
  cursorPosition,
  location,
  preferredExpressionType,
  callbacks,
  advanceCursorAfterInitialColumn,
  ignoredColumnsForEmptyExpression,
}: {
  innerText: string;
  expressionRoot: ESQLSingleAstItem | undefined;
  context: ICommandContext | undefined;
  functionParameterContext?: FunctionParameterContext;
  query: string;
  command: ESQLCommand;
  cursorPosition: number;
  location: Location;
  preferredExpressionType?: SupportedDataType;
  callbacks: ICommandCallbacks | undefined;
  advanceCursorAfterInitialColumn?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
}): Promise<ISuggestionItem[]> {
  const fn = expressionRoot as ESQLFunction;
  const fnDefinition = getFunctionDefinition(fn.name);

  if (!fnDefinition || !context) {
    return [];
  }

  const validationResult = getValidSignaturesAndTypesToSuggestNext(fn, context, fnDefinition);
  const existingFunctionsToIgnore = functionParameterContext?.functionsToIgnore || [];
  const newFunctionParameterContext: FunctionParameterContext = {
    paramDefinitions: validationResult.compatibleParamDefs,
    functionsToIgnore: existingFunctionsToIgnore.includes(fn.name)
      ? existingFunctionsToIgnore
      : [...existingFunctionsToIgnore, fn.name],
    hasMoreMandatoryArgs: validationResult.hasMoreMandatoryArgs,
    functionDefinition: fnDefinition,
  };

  const fnArgs = (expressionRoot as ESQLFunction).args;
  const lastArg = fnArgs.slice(-1)[0] as ESQLAstItem;

  const startingNewParameterExpression = /,\s*$/.test(innerText);

  const isFirstArgEmpty =
    fnArgs.length > 0 &&
    fnArgs[0] &&
    (Array.isArray(fnArgs[0]) ? fnArgs[0].length === 0 : !fnArgs[0]) &&
    innerText.trimEnd().endsWith('(');

  const newExpressionRoot =
    startingNewParameterExpression || isFirstArgEmpty
      ? undefined
      : ((Array.isArray(lastArg) ? lastArg[0] : lastArg) as ESQLSingleAstItem);

  return suggestForExpression({
    query,
    expressionRoot: newExpressionRoot,
    command,
    cursorPosition,
    location,
    context,
    callbacks,
    options: {
      preferredExpressionType,
      advanceCursorAfterInitialColumn,
      ignoredColumnsForEmptyExpression,
      functionParameterContext: newFunctionParameterContext,
    },
  });
}

// Extracted handler: logic for suggestions after an operator (AND/OR/IN/..., including lists)
async function handleAfterOperator({
  innerText,
  expressionRoot,
  location,
  preferredExpressionType,
  context,
  env,
  getColumnsByType: getColumnsByTypeParam,
  hasMinimumLicenseRequired: hasMinimumLicenseRequiredParam,
  activeProduct: activeProductParam,
}: {
  innerText: string;
  expressionRoot: ESQLFunction;
  location: Location;
  preferredExpressionType?: SupportedDataType;
  context?: ICommandContext;
  env?: ResolvedEnv;
  getColumnsByType?: GetColumnsByTypeFn;
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean;
  activeProduct?: PricingProduct;
}): Promise<ISuggestionItem[]> {
  const suggestions: ISuggestionItem[] = [];
  const getColumnsByType =
    env?.getColumnsByType ?? getColumnsByTypeParam ?? (() => Promise.resolve([]));
  const hasMinimumLicenseRequired =
    env?.hasMinimumLicenseRequired ?? hasMinimumLicenseRequiredParam;
  const activeProduct = env?.activeProduct ?? activeProductParam;

  // IN/NOT IN operators handling with list suggestions
  if (['in', 'not in'].includes(expressionRoot.name)) {
    const list = expressionRoot.args[1];

    if (isList(list)) {
      const noParens = list.location.min === 0 && list.location.max === 0;
      if (noParens) {
        return [listCompleteItem];
      }

      const cursorPos = innerText.length;
      if (cursorPos <= list.location.max) {
        const [firstArg] = expressionRoot.args;
        if (isColumn(firstArg)) {
          const argType = getExpressionType(firstArg, context?.columns);
          if (argType) {
            const otherArgs = isList(list)
              ? list.values
              : expressionRoot.args.filter(Array.isArray).flat().filter(isColumn);

            const ignoredColumns = [
              firstArg.parts.join('.'),
              ...otherArgs.map((col: any) => col.parts?.join('.') || col.name),
            ].filter(Boolean);

            return await getFieldsOrFunctionsSuggestions(
              [argType],
              location,
              getColumnsByType,
              { functions: true, columns: true },
              { ignoreColumns: ignoredColumns },
              hasMinimumLicenseRequired,
              activeProduct
            );
          }
        }
        return [];
      }
      // Cursor after list: fall through to rightmost operator logic
    } else {
      const [firstArg] = expressionRoot.args;
      if (isColumn(firstArg)) {
        const argType = getExpressionType(firstArg, context?.columns);
        if (argType) {
          return await getFieldsOrFunctionsSuggestions(
            [argType],
            location,
            getColumnsByType,
            { functions: true, columns: true },
            { ignoreColumns: [firstArg.parts.join('.')] },
            hasMinimumLicenseRequired,
            activeProduct
          );
        }
      }
      return [];
    }
  }

  // Rightmost operator and logical operator suggestions
  let rightmostOperator = expressionRoot;
  const walker = new Walker({
    visitFunction: (fn: ESQLFunction) => {
      if (fn.location.min > rightmostOperator.location.min && fn.subtype !== 'variadic-call')
        rightmostOperator = fn;
    },
  });
  walker.walkFunction(expressionRoot);

  if (rightmostOperator.text.toLowerCase().trim().endsWith('null')) {
    suggestions.push(...logicalOperators.map(getOperatorSuggestion));
    return suggestions;
  }

  if (
    ['in', 'not in'].includes(rightmostOperator.name) &&
    rightmostOperator.subtype === 'binary-expression'
  ) {
    const cursorPos = innerText.length;
    const operatorEnd = rightmostOperator.location.max;
    if (cursorPos > operatorEnd) {
      suggestions.push(...logicalOperators.map(getOperatorSuggestion));
      return suggestions;
    }
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

  return suggestions;
}

// Extracted handler: logic for suggestions after literal/column/function
async function handleAfterLiteralColumnOrFunction({
  expressionRoot,
  position,
  functionParameterContext,
  location,
  context,
  env,
  getColumnsByType: getColumnsByTypeParam,
  hasMinimumLicenseRequired: hasMinimumLicenseRequiredParam,
  activeProduct: activeProductParam,
}: {
  expressionRoot: ESQLSingleAstItem | undefined;
  position: ReturnType<typeof getExpressionPosition>;
  functionParameterContext?: FunctionParameterContext;
  location: Location;
  context?: ICommandContext;
  env?: ResolvedEnv;
  getColumnsByType?: GetColumnsByTypeFn;
  hasMinimumLicenseRequired?: (minimumLicenseRequired: LicenseType) => boolean;
  activeProduct?: PricingProduct;
}): Promise<ISuggestionItem[]> {
  const suggestions: ISuggestionItem[] = [];
  const expressionType = getExpressionType(expressionRoot, context?.columns);
  const getColumnsByType =
    env?.getColumnsByType ?? getColumnsByTypeParam ?? (() => Promise.resolve([]));
  const hasMinimumLicenseRequired =
    env?.hasMinimumLicenseRequired ?? hasMinimumLicenseRequiredParam;
  const activeProduct = env?.activeProduct ?? activeProductParam;

  // If not in function param context and expression type is non-parameter, return no extras here
  if (!isParameterType(expressionType) && !functionParameterContext) {
    return suggestions;
  }

  // Unknown type handling within function param context
  if (functionParameterContext && expressionType === 'unknown') {
    const { paramDefinitions, functionDefinition } = functionParameterContext;
    if (!functionDefinition) {
      return suggestions;
    }

    const constantOnlyParamDefs = paramDefinitions.filter((p) => p.constantOnly);
    const nonConstantParamDefs = paramDefinitions.filter((p) => !p.constantOnly);

    if (constantOnlyParamDefs.length > 0) {
      suggestions.push(
        ...getCompatibleLiterals(
          ensureKeywordAndText(constantOnlyParamDefs.map((p) => p.type)),
          { supportsControls: context?.supportsControls },
          context?.variables
        )
      );
    }

    const isCaseWithEmptyParams =
      functionDefinition.name === 'case' && paramDefinitions.length === 0;

    if (nonConstantParamDefs.length > 0 || isCaseWithEmptyParams) {
      const isBooleanCondition =
        functionDefinition.name === 'case' ||
        paramDefinitions.some((p) => p.type === 'boolean' && p.name === 'condition');

      const acceptedTypes =
        isBooleanCondition || isCaseWithEmptyParams
          ? ['any']
          : ensureKeywordAndText(nonConstantParamDefs.map((p) => p.type));

      const hasMoreMandatoryArgs = functionParameterContext.hasMoreMandatoryArgs ?? false;
      const columnSuggestions = await getColumnsByType(acceptedTypes, [], {
        advanceCursor: hasMoreMandatoryArgs,
        openSuggestions: true,
        addComma: hasMoreMandatoryArgs,
      });
      suggestions.push(...pushItUpInTheList(columnSuggestions, true));

      suggestions.push(
        ...getFunctionSuggestions(
          {
            location,
            returnTypes: acceptedTypes,
            ignored: functionParameterContext.functionsToIgnore,
          },
          hasMinimumLicenseRequired,
          activeProduct
        )
      );
    }

    return suggestions;
  }

  // Boolean condition inside function parameter (e.g., CASE)
  const canBeBooleanCondition = functionParameterContext?.paramDefinitions?.some(
    (p) => p.type === 'boolean' && p.name === 'condition'
  );
  if (canBeBooleanCondition) {
    suggestions.push(
      ...comparisonFunctions.map<ISuggestionItem>(({ name, description }) => ({
        label: name,
        text: name,
        kind: 'Function' as ItemKind,
        detail: description,
      })),
      commaCompleteItem
    );
    return suggestions;
  }

  // Time interval completions after numeric literal
  let suggestedIntervals = false;
  if (
    functionParameterContext &&
    isLiteral(expressionRoot) &&
    isNumericType(expressionRoot.literalType)
  ) {
    const { paramDefinitions, hasMoreMandatoryArgs, functionDefinition } = functionParameterContext;
    if (!functionDefinition) {
      return suggestions;
    }
    const acceptedTypes = paramDefinitions.map((p) => p.type);
    if (acceptedTypes.includes('time_duration') || acceptedTypes.includes('date_period')) {
      suggestedIntervals = true;
      const shouldAddComma =
        hasMoreMandatoryArgs && functionDefinition.type !== FunctionDefinitionTypes.OPERATOR;
      suggestions.push(
        ...buildConstantsDefinitions(
          timeUnitsToSuggest.map(({ name }) => name),
          undefined,
          undefined,
          { addComma: shouldAddComma, advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs }
        )
      );
      if (shouldAddComma || hasMoreMandatoryArgs) {
        suggestions.push(commaCompleteItem);
      }
    }
  }

  if (!suggestedIntervals) {
    suggestions.push(
      ...getOperatorSuggestions(
        {
          location,
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
  }

  return suggestions;
}

// Extracted handler: logic for suggestions when expression is empty
async function handleEmptyExpression({
  functionParameterContext,
  location,
  context,
  env,
  advanceCursorAfterInitialColumn,
  ignoredColumnsForEmptyExpression,
  isCursorFollowedByComma,
  command,
}: {
  functionParameterContext?: FunctionParameterContext;
  location: Location;
  context?: ICommandContext;
  env: ResolvedEnv;
  advanceCursorAfterInitialColumn?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
  isCursorFollowedByComma?: boolean;
  command: ESQLCommand;
}): Promise<ISuggestionItem[]> {
  const suggestions: ISuggestionItem[] = [];
  let acceptedTypes: FunctionParameterType[] = ['any'];

  if (functionParameterContext) {
    const { paramDefinitions, functionDefinition } = functionParameterContext;
    if (!functionDefinition) {
      return suggestions;
    }

    if (functionDefinition?.name === 'count') {
      suggestions.push(allStarConstant);
    }

    const suggestedValues = uniq(
      paramDefinitions
        .map((d) => d.suggestedValues)
        .filter((d) => d)
        .flat()
    ) as string[];
    if (suggestedValues.length) {
      return buildValueDefinitions(suggestedValues);
    }

    const constantOnlyParamDefs = paramDefinitions.filter(
      (p) => p.constantOnly || /_duration/.test(p.type as string)
    );
    const nonConstantParamDefs = paramDefinitions.filter((d) => !d.constantOnly);

    if (constantOnlyParamDefs.length > 0) {
      suggestions.push(
        ...getCompatibleLiterals(
          ensureKeywordAndText(constantOnlyParamDefs.map((p) => p.type)),
          { supportsControls: context?.supportsControls },
          context?.variables
        )
      );
    }

    const paramTypes = paramDefinitions.map((p) => p.type);
    const hasDateParam = paramTypes.includes('date');
    const isWhereOrEval = ['where', 'eval'].includes(command.name);
    const isNotFullTextSearch = !FULL_TEXT_SEARCH_FUNCTIONS.includes(functionDefinition.name);

    if (hasDateParam && isWhereOrEval && isNotFullTextSearch) {
      const hasMoreMandatoryArgs = functionParameterContext.hasMoreMandatoryArgs;
      const shouldAddComma =
        hasMoreMandatoryArgs &&
        functionDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
        !isCursorFollowedByComma;

      suggestions.push(
        ...getDateLiterals({
          addComma: shouldAddComma,
          advanceCursorAndOpenSuggestions: hasMoreMandatoryArgs,
        })
      );
    }

    const isCaseWithEmptyParams =
      functionDefinition.name === 'case' && paramDefinitions.length === 0;
    const isBooleanCondition =
      functionDefinition.name === 'case' ||
      paramDefinitions.some((p) => p.type === 'boolean' && p.name === 'condition');

    if (nonConstantParamDefs.length > 0 || isCaseWithEmptyParams) {
      acceptedTypes =
        isBooleanCondition || isCaseWithEmptyParams
          ? ['any']
          : ensureKeywordAndText(nonConstantParamDefs.map((p) => p.type));
    } else if (paramDefinitions.length > 0) {
      acceptedTypes = ensureKeywordAndText(paramDefinitions.map((p) => p.type));
    } else {
      acceptedTypes = ['any'];
    }

    const hasMoreMandatoryArgs = functionParameterContext.hasMoreMandatoryArgs;
    const shouldAddComma =
      hasMoreMandatoryArgs &&
      functionDefinition.type !== FunctionDefinitionTypes.OPERATOR &&
      !isCursorFollowedByComma &&
      !isBooleanCondition &&
      !isCaseWithEmptyParams;

    let onlyConstantParams =
      nonConstantParamDefs.length === 0 && paramDefinitions.length > 0 && !isCaseWithEmptyParams;
    if (onlyConstantParams && functionDefinition.name === 'bucket') {
      onlyConstantParams = false;
    }

    if (env.getColumnsByType && !onlyConstantParams) {
      const columnSuggestions = await env.getColumnsByType(
        acceptedTypes,
        ignoredColumnsForEmptyExpression,
        {
          advanceCursor: shouldAddComma,
          openSuggestions: true,
          addComma: shouldAddComma,
        }
      );
      suggestions.push(...pushItUpInTheList(columnSuggestions, true));
    }

    if (!onlyConstantParams && paramDefinitions.every((d) => !d.fieldsOnly)) {
      const functionSuggestions = getFunctionSuggestions(
        {
          location,
          returnTypes: acceptedTypes,
          ignored: functionParameterContext.functionsToIgnore || [],
        },
        env.hasMinimumLicenseRequired,
        env.activeProduct
      );
      if (shouldAddComma) {
        suggestions.push(...functionSuggestions.map((s) => ({ ...s, text: s.text + ',' })));
      } else {
        suggestions.push(...functionSuggestions);
      }
    }
  }

  if (!functionParameterContext && env.getColumnsByType) {
    const columnSuggestions: ISuggestionItem[] = await env.getColumnsByType(
      acceptedTypes,
      ignoredColumnsForEmptyExpression,
      { advanceCursor: advanceCursorAfterInitialColumn, openSuggestions: true }
    );
    suggestions.push(...pushItUpInTheList(columnSuggestions, true));
  }

  if (!functionParameterContext) {
    suggestions.push(
      ...getFunctionSuggestions(
        { location, returnTypes: acceptedTypes },
        env.hasMinimumLicenseRequired,
        env.activeProduct
      )
    );
    if (context?.supportsControls) {
      suggestions.push(
        ...getControlSuggestionIfSupported(
          context.supportsControls,
          ESQLVariableType.VALUES,
          context.variables
        )
      );
    }
  }

  return suggestions;
}

// Parses query and finds AST node at cursor position with location context
// Used by commands to prepare context for suggestForExpression calls
function getExpressionContext(
  query: string,
  command: ESQLCommand,
  cursorPosition?: number,
  context?: ICommandContext
): {
  ast: any;
  node: any;
  location: Location;
  functionParameterContext?: FunctionParameterContext;
} | null {
  const innerText = query.substring(0, cursorPosition);
  const correctedQuery = correctQuerySyntax(innerText);
  const { ast } = parse(correctedQuery, { withFormatting: true });
  // Use innerText.length instead of cursorPosition because correctQuerySyntax may add characters
  // which shifts positions in the AST
  const { node, containingFunction } = findAstPosition(ast, innerText.length);

  if (!node) {
    return null;
  }

  // GENERAL FIX: When node is an option but containingFunction exists, prefer the function context
  // This handles cases where the parser creates spurious options during incomplete expressions
  const effectiveNode = node.type === 'option' && containingFunction ? containingFunction : node;

  // Calculate location dynamically (same as original getInsideFunctionsSuggestions)
  // This handles command options (like BY in STATS) and timeseries context detection
  const commandArgIndex = command.args.findIndex(
    (cmdArg) => !Array.isArray(cmdArg) && cmdArg?.location?.max >= effectiveNode.location.max
  );
  const finalCommandArgIndex =
    command.name !== 'stats' && command.name !== 'inline stats'
      ? -1
      : commandArgIndex < 0
      ? Math.max(command.args.length - 1, 0)
      : commandArgIndex;

  const location = getLocationInfo(
    cursorPosition ?? 0,
    command,
    ast,
    isAggFunctionUsedAlready(command, finalCommandArgIndex)
  ).id;

  // Replicate the exact logic from getInsideFunctionsSuggestions
  // Only return a result if we're in a specific applicable context

  if (effectiveNode.type === 'literal' && effectiveNode.literalType === 'keyword') {
    // command ... "<here>"
    return null;
  }

  if (effectiveNode.type === 'function') {
    // Check for specific applicable contexts like the original getInsideFunctionsSuggestions

    // CASE binary expressions (handled by getSuggestionsToRightOfOperatorExpression)
    if (
      containingFunction?.name === 'case' &&
      !Array.isArray(effectiveNode) &&
      effectiveNode?.subtype === 'binary-expression'
    ) {
      // Return context for CASE binary expressions - but this would need special handling
      // For now, return null to let normal flow handle it
      return null;
    }

    // IN/NOT IN operators (handled by getListArgsSuggestions)
    if (['in', 'not in'].includes(effectiveNode.name)) {
      // Return context for IN operators - but this would need special handling
      // For now, return null to let normal flow handle it
      return null;
    }

    // Function parameters (the main case we want to handle)
    const isOperator = getFunctionDefinition(node.name)?.type === FunctionDefinitionTypes.OPERATOR;

    if (isNotEnrichClauseAssigment(effectiveNode, command) && !isOperator) {
      // This is where we build the functionParameterContext for regular function parameters
      // Use effectiveNode if it's a function, otherwise use containingFunction
      const targetFunction =
        isFunctionExpression(effectiveNode) && effectiveNode.subtype === 'variadic-call'
          ? effectiveNode
          : containingFunction;

      if (targetFunction && isFunctionExpression(targetFunction)) {
        const fnDefinition = getFunctionDefinition(targetFunction.name);
        if (fnDefinition) {
          const references = {
            columns: context?.columns || new Map(),
          };

          const validationResult = getValidSignaturesAndTypesToSuggestNext(
            targetFunction,
            references,
            fnDefinition
          );

          // Build functionsToIgnore list similar to original getFunctionArgsSuggestions
          const fnToIgnore = [targetFunction.name];

          // Add STATS-specific function filtering logic
          fnToIgnore.push(
            ...getAllFunctions({ type: FunctionDefinitionTypes.GROUPING }).map(({ name }) => name)
          );

          const finalArg = command.args[finalCommandArgIndex];
          if (
            (command.name !== 'stats' && command.name !== 'inline stats') ||
            (finalArg &&
              !Array.isArray(finalArg) &&
              finalArg.type === 'option' &&
              finalArg.name === 'by')
          ) {
            // Standard context - already have containingFunction.name in fnToIgnore
          } else {
            fnToIgnore.push(
              ...getFunctionsToIgnoreForStats(command, finalCommandArgIndex),
              ...(isAggFunctionUsedAlready(command, finalCommandArgIndex)
                ? getAllFunctions({ type: FunctionDefinitionTypes.AGG }).map(({ name }) => name)
                : []),
              ...(isTimeseriesAggUsedAlready(command, finalCommandArgIndex)
                ? getAllFunctions({ type: FunctionDefinitionTypes.TIME_SERIES_AGG }).map(
                    ({ name }) => name
                  )
                : [])
            );
          }

          const functionParameterContext = {
            paramDefinitions: validationResult.compatibleParamDefs,
            functionsToIgnore: fnToIgnore,
            hasMoreMandatoryArgs: validationResult.hasMoreMandatoryArgs,
            functionDefinition: fnDefinition,
          };

          return { ast, node: effectiveNode, location, functionParameterContext };
        }
      }
    }
  }

  // If none of the specific cases match, return null like the original getInsideFunctionsSuggestions
  return null;
}

// Internal normalized args to simplify suggestForExpression routing logic
interface InternalSuggestArgs {
  innerText?: string;
  location?: Location;
  expressionRoot?: ESQLSingleAstItem;
  functionParameterContext?: FunctionParameterContext;
  preferredExpressionType?: SupportedDataType;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
  advanceCursorAfterInitialColumn?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
  isCursorFollowedByComma?: boolean;
}

function normalizeSuggestArgs(params: {
  query: string;
  command: ESQLCommand;
  cursorPosition: number;
  context: ICommandContext | undefined;
  callbacks: ICommandCallbacks | undefined;
  location?: Location;
  expressionRoot?: ESQLSingleAstItem | undefined;
  functionParameterContext?: FunctionParameterContext;
  preferredExpressionType?: SupportedDataType;
  advanceCursorAfterInitialColumn?: boolean;
  ignoredColumnsForEmptyExpression?: string[];
}): InternalSuggestArgs | null {
  const {
    query,
    command,
    cursorPosition,
    expressionRoot: explicitExpressionRoot,
    location: explicitLocation,
    functionParameterContext: explicitFnParamCtx,
    preferredExpressionType,
    context,
    callbacks,
    advanceCursorAfterInitialColumn,
    ignoredColumnsForEmptyExpression,
  } = params;

  let location = explicitLocation;
  let expressionRoot = explicitExpressionRoot;
  let functionParameterContext = explicitFnParamCtx;

  // Always calculate innerText from query + cursorPosition (no longer accepting explicit innerText)
  const innerText = query.substring(0, cursorPosition);

  const isCursorFollowedByComma = query.substring(cursorPosition).trimStart().startsWith(',');

  // Derive expressionRoot automatically unless explicitly passed (even as undefined)
  const shouldDeriveExpressionRoot = !('expressionRoot' in params);

  if (shouldDeriveExpressionRoot) {
    const expressionContext = getExpressionContext(query, command, cursorPosition, context);
    if (expressionContext) {
      // Found specific context (inside function, etc.)
      expressionRoot = expressionContext.node as ESQLSingleAstItem | undefined;
      location = explicitLocation ?? expressionContext.location;
      functionParameterContext = expressionContext.functionParameterContext;
    } else {
      // No specific context - use command.args[0] for top-level locations only
      const normalizedCommandName = command.name.toLowerCase().replace(/\s+/g, '_');
      const isTopLevelLocation =
        !explicitLocation ||
        explicitLocation.toLowerCase() === normalizedCommandName ||
        (normalizedCommandName === 'inline_stats' && explicitLocation.toLowerCase() === 'stats');

      if (isTopLevelLocation) {
        expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;
      }

      location = explicitLocation;
    }
  }

  return {
    innerText,
    location,
    expressionRoot,
    functionParameterContext,
    preferredExpressionType,
    context,
    callbacks,
    advanceCursorAfterInitialColumn,
    ignoredColumnsForEmptyExpression,
    isCursorFollowedByComma,
  };
}

// TODO: Consider refactoring to remove STATS-specific check and make generic for any BY clause
// Currently only works for STATS/INLINE STATS - could be generalized by removing command name check
function deriveIgnoredColumns(command: ESQLCommand, location?: Location): string[] {
  if (!location) {
    return [];
  }

  if (['stats', 'inline stats'].includes(command.name) && location === Location.STATS) {
    const byOption = command.args.find((arg) => !Array.isArray(arg) && arg.name === 'by') as
      | ESQLCommandOption
      | undefined;

    if (byOption) {
      const columnNodes = (byOption.args.filter(
        (arg) => !Array.isArray(arg) && arg.type === 'column'
      ) ?? []) as ESQLColumn[];

      return columnNodes.map((node) => node.parts.join('.'));
    }
  }

  return [];
}

// Determines if cursor should advance after column selection
// Default true, false for SORT (allow ASC/DESC) and STATS (allow aggregations)
function deriveAdvanceCursor(command: ESQLCommand, location?: Location): boolean {
  if (!location) {
    return true;
  }

  if (command.name === 'sort' && location === Location.SORT) {
    return false;
  }

  if (['stats', 'inline stats'].includes(command.name) && location === Location.STATS) {
    return false;
  }

  return true;
}

// Post-processing: attach replacement ranges to suggestions based on current prefix
function attachRanges(innerText: string, suggestions: ISuggestionItem[]) {
  const hasNonWhitespacePrefix = !/\s/.test(innerText[innerText.length - 1]);
  suggestions.forEach((s) => {
    if (['IS NULL', 'IS NOT NULL'].includes(s.text)) {
      // this suggestion has spaces in it (e.g. "IS NOT NULL")
      // so we need to see if there's an overlap
      s.rangeToReplace = getOverlapRange(innerText, s.text);
      return;
    } else if (hasNonWhitespacePrefix) {
      // get index of first char of final word
      const lastNonWhitespaceIndex = innerText.search(/\b\w(?=\w*$)/);
      s.rangeToReplace = {
        start: lastNonWhitespaceIndex,
        end: innerText.length,
      };
    }
  });
}

// Note: ENRICH doesn't use this function. IS isNotEnrichClauseAssigment guards against interference with ENRICH's special = syntax??
function isNotEnrichClauseAssigment(node: ESQLFunction, command: ESQLCommand) {
  return node.name !== '=' && command.name !== 'enrich';
}
