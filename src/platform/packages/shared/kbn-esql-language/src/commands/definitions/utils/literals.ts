/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ControlTriggerSource, ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from './autocomplete/helpers';
import type { ISuggestionItem } from '../../registry/types';
import { timeUnitsToSuggest } from '../constants';
import { getControlSuggestion } from './autocomplete/helpers';
import type { FunctionParameterType, SupportedDataType } from '../types';
import { commaCompleteItem } from '../../registry/complete_items';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';

export const TIME_SYSTEM_PARAMS = ['?_tstart', '?_tend'];

// Targeted: define option interfaces for constants/date literals
export interface BuildConstantsOptions {
  advanceCursorAndOpenSuggestions?: boolean;
  addComma?: boolean;
}

export interface DateLiteralsOptions {
  advanceCursorAndOpenSuggestions?: boolean;
  addComma?: boolean;
}

export const buildConstantsDefinitions = (
  userConstants: string[],
  detail?: string,
  sortText?: string,
  /**
   * Whether or not to advance the cursor and open the suggestions dialog after inserting the constant.
   */
  options?: BuildConstantsOptions,
  documentationValue?: string,
  category?: SuggestionCategory
): ISuggestionItem[] =>
  userConstants.map((label) => {
    const suggestion: ISuggestionItem = {
      label,
      text:
        label +
        (options?.addComma ? ',' : '') +
        (options?.advanceCursorAndOpenSuggestions ? ' ' : ''),
      kind: 'Constant',
      detail:
        detail ??
        i18n.translate('kbn-esql-language.esql.autocomplete.constantDefinition', {
          defaultMessage: `Constant`,
        }),
      ...(documentationValue ? { documentation: { value: documentationValue } } : {}),
      sortText: sortText ?? 'A',
      ...(category && { category }),
    };

    return options?.advanceCursorAndOpenSuggestions ? withAutoSuggest(suggestion) : suggestion;
  });

export function getDateLiterals(options?: DateLiteralsOptions) {
  return [
    ...buildConstantsDefinitions(
      TIME_SYSTEM_PARAMS,
      i18n.translate('kbn-esql-language.esql.autocomplete.namedParamDefinition', {
        defaultMessage: 'Bind to time filter',
      }),
      '1A',
      options,
      // appears when the user opens the second level popover
      i18n.translate('kbn-esql-language.esql.autocomplete.timeNamedParamDoc', {
        defaultMessage: `Use the \`?_tstart\` and \`?_tend\` parameters to bind a custom timestamp field to Kibana's time filter.`,
      }),
      SuggestionCategory.TIME_PARAM
    ),
    {
      label: i18n.translate('kbn-esql-language.esql.autocomplete.chooseFromTimePickerLabel', {
        defaultMessage: 'Choose from the time picker',
      }),
      text: '',
      kind: 'Issue',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.chooseFromTimePicker', {
        defaultMessage: 'Click to choose',
      }),
      sortText: '1A',
      category: SuggestionCategory.CUSTOM_ACTION,
      command: {
        id: 'esql.timepicker.choose',
        title: i18n.translate('kbn-esql-language.esql.autocomplete.chooseFromTimePicker', {
          defaultMessage: 'Click to choose',
        }),
      },
    } as ISuggestionItem,
  ];
}

export function getUnitDuration(unit: number = 1) {
  const filteredTimeLiteral = timeUnitsToSuggest.filter(({ name }) => {
    const result = /s$/.test(name);
    return unit > 1 ? result : !result;
  });
  return filteredTimeLiteral.map(({ name }) => `${unit} ${name}`);
}

/**
 * Returns time unit literals (e.g., "1 day", "1 hour") and optionally appends a trailing comma item.
 * Generic literal builder (no policy), controlled via options.
 */
export function getTimeUnitLiterals(
  addComma: boolean,
  advanceCursorAndOpenSuggestions: boolean
): ISuggestionItem[] {
  const items: ISuggestionItem[] = [
    ...buildConstantsDefinitions(
      timeUnitsToSuggest.map(({ name }) => name),
      undefined,
      undefined,
      {
        addComma,
        advanceCursorAndOpenSuggestions,
      }
    ),
  ];

  if (addComma || advanceCursorAndOpenSuggestions) {
    items.push(commaCompleteItem);
  }

  return items;
}

/**
 * Given information about the current parameter type, suggest
 * some literals that may make sense.
 */
export function getCompatibleLiterals(
  types: (FunctionParameterType | SupportedDataType | 'unknown')[],
  options?: {
    advanceCursorAndOpenSuggestions?: boolean;
    addComma?: boolean;
    supportsControls?: boolean;
  },
  variables?: ESQLControlVariable[]
) {
  const suggestions: ISuggestionItem[] = [];
  if (types.includes('time_duration')) {
    // TODO distinction between date_period and time durations!
    const timeLiteralSuggestions = [
      ...buildConstantsDefinitions(getUnitDuration(1), undefined, undefined, options),
    ];
    if (options?.supportsControls) {
      const userDefinedColumns =
        variables?.filter((variable) => variable.type === ESQLVariableType.TIME_LITERAL) ?? [];
      timeLiteralSuggestions.push(
        ...getControlSuggestion(
          ESQLVariableType.TIME_LITERAL,
          ControlTriggerSource.SMART_SUGGESTION,
          userDefinedColumns.map((v) => `?${v.key}`)
        )
      );
    }
    // filter plural for now and suggest only unit + singular
    suggestions.push(...timeLiteralSuggestions); // i.e. 1 year
  }

  if (types.includes('date')) {
    suggestions.push(
      ...getDateLiterals({
        addComma: options?.addComma,
        advanceCursorAndOpenSuggestions: options?.advanceCursorAndOpenSuggestions,
      })
    );
  }

  return suggestions;
}
