/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLAstItem, ESQLLiteral } from '../../types';
import { FunctionParameterType } from '../types';
import { ISuggestionItem } from '../../commands_registry/types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../commands_registry/constants';
import { getControlSuggestion } from './autocomplete/helpers';
import { timeUnits, timeUnitsToSuggest } from '../constants';
import { isLiteral } from '../../ast/is';

export const TIME_SYSTEM_PARAMS = ['?_tstart', '?_tend'];

export const buildConstantsDefinitions = (
  userConstants: string[],
  detail?: string,
  sortText?: string,
  /**
   * Whether or not to advance the cursor and open the suggestions dialog after inserting the constant.
   */
  options?: { advanceCursorAndOpenSuggestions?: boolean; addComma?: boolean }
): ISuggestionItem[] =>
  userConstants.map((label) => ({
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
    sortText: sortText ?? 'A',
    command: options?.advanceCursorAndOpenSuggestions ? TRIGGER_SUGGESTION_COMMAND : undefined,
  }));

export function getDateLiterals(options?: {
  advanceCursorAndOpenSuggestions?: boolean;
  addComma?: boolean;
}) {
  return [
    ...buildConstantsDefinitions(
      TIME_SYSTEM_PARAMS,
      i18n.translate('kbn-esql-ast.esql.autocomplete.namedParamDefinition', {
        defaultMessage: 'Named parameter',
      }),
      '1A',
      options
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

export function inKnownTimeInterval(timeIntervalUnit: string): boolean {
  return timeUnits.some((unit) => unit === timeIntervalUnit.toLowerCase());
}

/**
 * Compares two types, taking into account literal types
 * @TODO strengthen typing here (remove `string`)
 * @TODO — clean up time duration and date period
 */
export const compareTypesWithLiterals = (
  a: ESQLLiteral['literalType'] | FunctionParameterType | 'timeInterval' | string,
  b: ESQLLiteral['literalType'] | FunctionParameterType | 'timeInterval' | string
) => {
  if (a === b) {
    return true;
  }
  // In Elasticsearch function definitions, time_duration and date_period are used
  // time_duration is seconds/min/hour interval
  // date_period is day/week/month/year interval
  // So they are equivalent AST's 'timeInterval' (a date unit constant: e.g. 1 year, 15 month)
  if (a === 'time_duration' || a === 'date_period') return b === 'timeInterval';
  if (b === 'time_duration' || b === 'date_period') return a === 'timeInterval';

  return false;
};

/**
 * Checks if both types are string types.
 *
 * Functions in ES|QL accept `text` and `keyword` types interchangeably.
 * @param type1
 * @param type2
 * @returns
 */
function bothStringTypes(type1: string, type2: string): boolean {
  return (type1 === 'text' || type1 === 'keyword') && (type2 === 'text' || type2 === 'keyword');
}

export function doesLiteralMatchParameterType(argType: FunctionParameterType, item: ESQLLiteral) {
  if (item.literalType === argType) {
    return true;
  }

  if (bothStringTypes(argType, item.literalType)) {
    // all functions accept keyword literals for text parameters
    return true;
  }

  if (item.literalType === 'null') {
    // all parameters accept null, but this is not yet reflected
    // in our function definitions so we let it through here
    return true;
  }

  // some parameters accept string literals because of ES auto-casting
  if (
    item.literalType === 'keyword' &&
    (argType === 'date' ||
      argType === 'date_period' ||
      argType === 'version' ||
      argType === 'ip' ||
      argType === 'boolean')
  ) {
    return true;
  }

  return false;
}

function isValidDateString(dateString: unknown): boolean {
  if (typeof dateString !== 'string') return false;
  const timestamp = Date.parse(dateString.replace(/\"/g, ''));
  return !isNaN(timestamp);
}

/**
 * Returns true is node is a valid literal that represents a date
 * either a system time parameter or a date string generated by date picker
 * @param dateString
 * @returns
 */
export function isLiteralDateItem(nodeArg: ESQLAstItem): boolean {
  return (
    isLiteral(nodeArg) &&
    // If text is ?start or ?end, it's a system time parameter
    (TIME_SYSTEM_PARAMS.includes(nodeArg.text) ||
      // Or if it's a string generated by date picker
      isValidDateString(nodeArg.value))
  );
}
