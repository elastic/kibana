/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLControlVariable, InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { uniqBy } from 'lodash';
import { isLiteral } from '../../../ast/is';
import type {
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
} from '../../../commands_registry/types';
import { Location } from '../../../commands_registry/types';
import type { ESQLAstItem, ESQLFunction } from '../../../types';
import { EDITOR_MARKER } from '../../constants';
import type { FunctionDefinition } from '../../types';
import type { SupportedDataType } from '../../types';
import { argMatchesParamType, getExpressionType, getParamAtPosition } from '../expressions';
import { filterFunctionDefinitions, getAllFunctions, getFunctionSuggestion } from '../functions';
import { buildConstantsDefinitions, getCompatibleLiterals, getDateLiterals } from '../literals';
import { getColumnByName } from '../shared';

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

interface FieldSuggestionsOptions {
  ignoreColumns?: string[];
  values?: boolean;
  addSpaceAfterField?: boolean;
  openSuggestions?: boolean;
  addComma?: boolean;
  promoteToTop?: boolean;
}

export async function getFieldsSuggestions(
  types: (SupportedDataType | 'unknown' | 'any')[],
  getFieldsByType: GetColumnsByTypeFn,
  options: FieldSuggestionsOptions = {}
): Promise<ISuggestionItem[]> {
  const {
    ignoreColumns = [],
    values = false,
    addSpaceAfterField = false,
    openSuggestions = false,
    addComma = false,
    promoteToTop = true,
  } = options;

  const suggestions = await getFieldsByType(types, ignoreColumns, {
    advanceCursor: addSpaceAfterField,
    openSuggestions,
    addComma,
    variableType: values ? ESQLVariableType.VALUES : ESQLVariableType.FIELDS,
  });

  return pushItUpInTheList(suggestions as ISuggestionItem[], promoteToTop);
}

interface FunctionSuggestionOptions {
  ignored?: string[];
  addComma?: boolean;
  addSpaceAfterFunction?: boolean;
  openSuggestions?: boolean;
}

interface GetFunctionsSuggestionsParams {
  location: Location;
  types: (SupportedDataType | 'unknown' | 'any')[];
  options?: FunctionSuggestionOptions;
  context?: ICommandContext;
  callbacks?: ICommandCallbacks;
}

export function getFunctionsSuggestions({
  location,
  types,
  options = {},
  context,
  callbacks,
}: GetFunctionsSuggestionsParams): ISuggestionItem[] {
  const {
    ignored = [],
    addComma = false,
    addSpaceAfterFunction = false,
    openSuggestions = false,
  } = options;

  const predicates = {
    location,
    returnTypes: types,
    ignored,
  };

  const hasMinimumLicenseRequired = callbacks?.hasMinimumLicenseRequired;
  const activeProduct = context?.activeProduct;

  const filteredFunctions = filterFunctionDefinitions(
    getAllFunctions({ includeOperators: false }),
    predicates,
    hasMinimumLicenseRequired,
    activeProduct
  );

  const textSuffix = (addComma ? ',' : '') + (addSpaceAfterFunction ? ' ' : '');

  return filteredFunctions.map((fn) => {
    const suggestion = getFunctionSuggestion(fn);

    if (textSuffix) {
      suggestion.text += textSuffix;
    }

    if (openSuggestions) {
      return withAutoSuggest(suggestion);
    }

    return suggestion;
  });
}

interface LiteralSuggestionsOptions {
  includeDateLiterals?: boolean;
  includeCompatibleLiterals?: boolean;
  // Pass-through options for literal builders
  addComma?: boolean;
  advanceCursorAndOpenSuggestions?: boolean;
}

export function getLiteralsSuggestions(
  types: (SupportedDataType | 'unknown' | 'any')[],
  location: Location,
  options: LiteralSuggestionsOptions = {}
): ISuggestionItem[] {
  const { includeDateLiterals = true, includeCompatibleLiterals = true } = options;

  const suggestions: ISuggestionItem[] = [];

  // Date literals gated by policy: only WHERE/EVAL/STATS_WHERE and only if types include 'date'
  if (
    includeDateLiterals &&
    (location === Location.WHERE ||
      location === Location.EVAL ||
      location === Location.STATS_WHERE) &&
    types.includes('date')
  ) {
    suggestions.push(
      ...getDateLiterals({
        addComma: options.addComma,
        advanceCursorAndOpenSuggestions: options.advanceCursorAndOpenSuggestions,
      })
    );
  }

  if (includeCompatibleLiterals) {
    suggestions.push(
      ...getCompatibleLiterals(types, {
        addComma: options.addComma,
        advanceCursorAndOpenSuggestions: options.advanceCursorAndOpenSuggestions,
      })
    );
  }

  return suggestions;
}

export function getLastNonWhitespaceChar(text: string) {
  return text[text.trimEnd().length - 1];
}

export const columnExists = (col: string, context?: ICommandContext) =>
  Boolean(context ? getColumnByName(col, context) : undefined);

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

export const getVariablePrefix = (variableType: ESQLVariableType) =>
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
    relevantFuncSignatures
      .map((signature) => getParamAtPosition(signature, argIndex))
      .filter(
        (param): param is NonNullable<ReturnType<typeof getParamAtPosition>> => param != null
      ),
    (param) => `${param.type}-${param.constantOnly}`
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
    validSignatures,
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
