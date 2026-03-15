/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLControlVariable,
  InferenceEndpointAutocompleteItem,
  ControlTriggerSource,
} from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { uniqBy } from 'lodash';
import type {
  GetColumnsByTypeFn,
  ICommandCallbacks,
  ICommandContext,
  ISuggestionItem,
} from '../../../registry/types';
import { Location } from '../../../registry/types';
import type { SupportedDataType } from '../../types';
import { filterFunctionDefinitions, getAllFunctions, getFunctionSuggestion } from '../functions';
import { SuggestionCategory } from '../../../../language/autocomplete/utils/sorting/types';
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
    detail: i18n.translate('kbn-esql-language.esql.autocomplete.variableDefinition', {
      defaultMessage: `Column specified by the user within the ES|QL query`,
    }),
    sortText: 'D',
    category: SuggestionCategory.USER_DEFINED_COLUMN,
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
  canBeMultiValue?: boolean;
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
    canBeMultiValue = false,
  } = options;

  const variableType = (() => {
    if (canBeMultiValue) return ESQLVariableType.MULTI_VALUES;
    if (values) return ESQLVariableType.VALUES;
    return ESQLVariableType.FIELDS;
  })();

  const suggestions = await getFieldsByType(types, ignoreColumns, {
    advanceCursor: addSpaceAfterField,
    openSuggestions,
    addComma,
    variableType,
  });

  return pushItUpInTheList(suggestions as ISuggestionItem[], promoteToTop);
}

interface FunctionSuggestionOptions {
  ignored?: string[];
  addComma?: boolean;
  addSpaceAfterFunction?: boolean;
  constantGeneratingOnly?: boolean;
  suggestOnlyName?: boolean;
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
    suggestOnlyName = false,
    addSpaceAfterFunction = false,
    constantGeneratingOnly = false,
  } = options;

  const predicates = {
    location,
    returnTypes: types,
    ignored,
  };

  const hasMinimumLicenseRequired = callbacks?.hasMinimumLicenseRequired;
  const activeProduct = context?.activeProduct;

  let filteredFunctions = filterFunctionDefinitions(
    getAllFunctions({ includeOperators: false }),
    predicates,
    hasMinimumLicenseRequired,
    activeProduct
  );

  // Filter for constant-generating functions (functions without parameters)
  if (constantGeneratingOnly) {
    const typeSet = new Set(types);
    filteredFunctions = filteredFunctions.filter((fn) =>
      fn.signatures.some((sig) => sig.params.length === 0 && typeSet.has(sig.returnType))
    );
  }

  const textSuffix = (addComma ? ',' : '') + (addSpaceAfterFunction ? ' ' : '');

  return filteredFunctions.map((fn) => {
    const suggestion = getFunctionSuggestion(fn);

    if (suggestOnlyName) {
      suggestion.text = fn.name.toUpperCase();
      return suggestion;
    }

    if (textSuffix) {
      suggestion.text += textSuffix;
    }

    return withAutoSuggest(suggestion);
  });
}

interface LiteralSuggestionsOptions {
  includeDateLiterals?: boolean;
  includeCompatibleLiterals?: boolean;
  // Pass-through options for literal builders
  addComma?: boolean;
  advanceCursorAndOpenSuggestions?: boolean;
  supportsControls?: boolean;
  variables?: ESQLControlVariable[];
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
      ...getCompatibleLiterals(
        types,
        {
          addComma: options.addComma,
          advanceCursorAndOpenSuggestions: options.advanceCursorAndOpenSuggestions,
          supportsControls: options.supportsControls,
        },
        options.variables
      )
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
  triggerSource: ControlTriggerSource,
  variables?: string[],
  suggestCreation = true
): ISuggestionItem[] {
  return [
    ...(suggestCreation
      ? [
          {
            label: i18n.translate('kbn-esql-language.esql.autocomplete.createControlLabel', {
              defaultMessage: 'Create control',
            }),
            text: '',
            kind: 'Issue',
            detail: i18n.translate('kbn-esql-language.esql.autocomplete.createControlDetailLabel', {
              defaultMessage: 'Click to create',
            }),
            sortText: '1',
            category: SuggestionCategory.CUSTOM_ACTION,
            command: {
              id: `esql.control.${type}.create`,
              title: i18n.translate(
                'kbn-esql-language.esql.autocomplete.createControlDetailLabel',
                {
                  defaultMessage: 'Click to create',
                }
              ),
              arguments: [{ triggerSource }],
            },
          } as ISuggestionItem,
        ]
      : []),
    ...(variables?.length
      ? buildConstantsDefinitions(
          variables,
          i18n.translate('kbn-esql-language.esql.autocomplete.namedParamDefinition', {
            defaultMessage: 'Named parameter',
          }),
          '1A',
          undefined,
          undefined,
          SuggestionCategory.USER_DEFINED_COLUMN
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
  triggerSource: ControlTriggerSource,
  variables?: ESQLControlVariable[],
  shouldBePrefixed = true
) {
  const prefix = shouldBePrefixed ? getVariablePrefix(type) : '';
  const filteredVariables = variables?.filter((variable) => variable.type === type) ?? [];

  const controlSuggestion = getControlSuggestion(
    type,
    triggerSource,
    filteredVariables?.map((v) => `${prefix}${v.key}`),
    supportsControls
  );

  return controlSuggestion;
}

export function createInferenceEndpointToCompletionItem(
  inferenceEndpoint: InferenceEndpointAutocompleteItem
): ISuggestionItem {
  return {
    detail: i18n.translate('kbn-esql-language.esql.definitions.rerankInferenceIdDoc', {
      defaultMessage: 'Inference endpoint used for the completion',
    }),
    kind: 'Reference',
    label: inferenceEndpoint.inference_id,
    sortText: '1',
    text: inferenceEndpoint.inference_id,
    category: SuggestionCategory.VALUE,
  };
}

/**
 * Given a suggestion item, decorates it with editor.action.triggerSuggest
 * that triggers the autocomplete dialog again after accepting the suggestion.
 *
 * If the suggestion item already has a custom command, it will preserve it, by attaching
 * the triggerSuggest command as part of a multiCommands execution.
 */
export function withAutoSuggest(suggestionItem: ISuggestionItem): ISuggestionItem {
  const triggerAutoSuggestCommand = {
    title: 'Trigger Suggestion Dialog',
    id: 'editor.action.triggerSuggest',
  };

  return appendCommandToSuggestionItem(suggestionItem, triggerAutoSuggestCommand);
}

/**
 * Appends a command to a suggestion item, preserving existing commands by using multiCommands if necessary.
 * @param suggestionItem
 * @param commandToAppend
 * @returns
 */
export function appendCommandToSuggestionItem(
  suggestionItem: ISuggestionItem,
  commandToAppend: ISuggestionItem['command']
): ISuggestionItem {
  if (!commandToAppend) {
    return suggestionItem;
  }

  // If the suggestion has multiCommands, append the new command
  if (suggestionItem.command?.id === 'esql.multiCommands') {
    const existingCommands: ISuggestionItem['command'][] = suggestionItem.command.arguments
      ? JSON.parse(suggestionItem.command.arguments[0].commands)
      : [];

    return {
      ...suggestionItem,
      command: createMultiCommand([...existingCommands, commandToAppend]),
    };
  }

  // If the suggestion already has a command, use multiCommands to execute the existing one
  // and then the new command
  const command =
    suggestionItem.command && suggestionItem.command.id !== commandToAppend.id
      ? createMultiCommand([suggestionItem.command, commandToAppend])
      : commandToAppend;

  return {
    ...suggestionItem,
    command,
  };
}

function createMultiCommand(
  commands: Array<ISuggestionItem['command']>
): ISuggestionItem['command'] {
  return {
    id: 'esql.multiCommands',
    title: 'Execute multiple commands',
    arguments: [
      {
        commands: JSON.stringify(uniqBy(commands, 'id')),
      },
    ],
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
          'kbn-esql-language.esql.autocomplete.createLookupIndexWithName',

          {
            defaultMessage: 'Create lookup index "{indexName}"',

            values: { indexName },
          }
        )
      : i18n.translate('kbn-esql-language.esql.autocomplete.createLookupIndex', {
          defaultMessage: 'Create lookup index',
        }),

    text: indexName,

    kind: 'Issue',

    filterText: indexName,

    detail: i18n.translate(
      'kbn-esql-language.esql.autocomplete.createLookupIndexDetailLabel',

      {
        defaultMessage: 'Click to create',
      }
    ),

    sortText: '0',

    category: SuggestionCategory.CUSTOM_ACTION,

    command: {
      id: `esql.lookup_index.create`,

      title: i18n.translate(
        'kbn-esql-language.esql.autocomplete.createLookupIndexDetailLabel',

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
