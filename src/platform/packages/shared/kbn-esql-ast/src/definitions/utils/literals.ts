/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from './autocomplete/helpers';
import type { ISuggestionItem } from '../../commands_registry/types';
import { timeUnitsToSuggest } from '../constants';
import { getControlSuggestion } from './autocomplete/helpers';

export const TIME_SYSTEM_PARAMS = ['?_tstart', '?_tend'];

export const buildConstantsDefinitions = (
  userConstants: string[],
  detail?: string,
  sortText?: string,
  /**
   * Whether or not to advance the cursor and open the suggestions dialog after inserting the constant.
   */
  options?: { advanceCursorAndOpenSuggestions?: boolean; addComma?: boolean },
  documentationValue?: string
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
        i18n.translate('kbn-esql-ast.esql.autocomplete.constantDefinition', {
          defaultMessage: `Constant`,
        }),
      ...(documentationValue ? { documentation: { value: documentationValue } } : {}),
      sortText: sortText ?? 'A',
    };

    return options?.advanceCursorAndOpenSuggestions ? withAutoSuggest(suggestion) : suggestion;
  });

export function getDateLiterals(options?: {
  advanceCursorAndOpenSuggestions?: boolean;
  addComma?: boolean;
}) {
  return [
    ...buildConstantsDefinitions(
      TIME_SYSTEM_PARAMS,
      i18n.translate('kbn-esql-ast.esql.autocomplete.namedParamDefinition', {
        defaultMessage: 'Bind to time filter',
      }),
      '1A',
      options,
      // appears when the user opens the second level popover
      i18n.translate('kbn-esql-ast.esql.autocomplete.timeNamedParamDoc', {
        defaultMessage: `Use the \`?_tstart\` and \`?_tend\` parameters to bind a custom timestamp field to Kibana's time filter.`,
      })
    ),
    {
      label: i18n.translate('kbn-esql-ast.esql.autocomplete.chooseFromTimePickerLabel', {
        defaultMessage: 'Choose from the time picker',
      }),
      text: '',
      kind: 'Issue',
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.chooseFromTimePicker', {
        defaultMessage: 'Click to choose',
      }),
      sortText: '1A',
      command: {
        id: 'esql.timepicker.choose',
        title: i18n.translate('kbn-esql-ast.esql.autocomplete.chooseFromTimePicker', {
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
 * Given information about the current command and the parameter type, suggest
 * some literals that may make sense.
 *
 * TODO — this currently tries to cover both command-specific suggestions and type
 * suggestions. We could consider separating the two... or just using parameter types
 * and forgetting about command-specific suggestions altogether.
 *
 * Another thought... should literal suggestions be defined in the definitions file?
 * That approach might allow for greater specificity in the suggestions and remove some
 * "magical" logic. Maybe this is really the same thing as the literalOptions parameter
 * definition property...
 */
export function getCompatibleLiterals(
  types: string[],
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
          userDefinedColumns.map((v) => `?${v.key}`)
        )
      );
    }
    // filter plural for now and suggest only unit + singular
    suggestions.push(...timeLiteralSuggestions); // i.e. 1 year
  }
  // this is a special type built from the suggestion system, not inherited from the AST
  if (types.includes('time_literal_unit')) {
    suggestions.push(
      ...buildConstantsDefinitions(
        timeUnitsToSuggest.map(({ name }) => name),
        undefined,
        undefined,
        options
      )
    ); // i.e. year, month, ...
  }
  return suggestions;
}
