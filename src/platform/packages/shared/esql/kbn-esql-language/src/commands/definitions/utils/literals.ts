/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  ControlTriggerSource,
  ESQLVariableType,
  GEOHASH_PRECISION_PARAM,
  GEOHEX_PRECISION_PARAM,
  GEOTILE_PRECISION_PARAM,
  type ESQLControlVariable,
} from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from './autocomplete/helpers';
import type { ISuggestionItem } from '../../registry/types';
import { timeUnitsToSuggest } from '../constants';
import { getControlSuggestion } from './autocomplete/helpers';
import type { FunctionParameterType, SupportedDataType } from '../types';
import { commaCompleteItem } from '../../registry/complete_items';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';

export const TIME_SYSTEM_PARAMS = ['?_tstart', '?_tend'];
export const GEOTILE_PRECISION_SYSTEM_PARAM = `?${GEOTILE_PRECISION_PARAM}`;
export const GEOHEX_PRECISION_SYSTEM_PARAM = `?${GEOHEX_PRECISION_PARAM}`;
export const GEOHASH_PRECISION_SYSTEM_PARAM = `?${GEOHASH_PRECISION_PARAM}`;
export const GEO_PRECISION_SYSTEM_PARAMS = [
  GEOTILE_PRECISION_SYSTEM_PARAM,
  GEOHEX_PRECISION_SYSTEM_PARAM,
  GEOHASH_PRECISION_SYSTEM_PARAM,
];

/** Functions whose `precision` argument can be bound to a geo precision system param. */
const GEO_PRECISION_PARAM_BY_FUNCTION: Record<string, string> = {
  st_geotile: GEOTILE_PRECISION_SYSTEM_PARAM,
  st_geohex: GEOHEX_PRECISION_SYSTEM_PARAM,
  st_geohash: GEOHASH_PRECISION_SYSTEM_PARAM,
};

/**
 * Returns the geo precision system param that can be bound to the given function argument,
 * or undefined when the argument does not support one.
 */
export const getGeoPrecisionSystemParam = (functionName: string, paramName?: string) =>
  paramName === 'precision'
    ? GEO_PRECISION_PARAM_BY_FUNCTION[functionName.toLowerCase()]
    : undefined;

export const GEO_PRECISION_SYSTEM_PARAM_DESCRIPTIONS: Record<string, string> = {
  [GEOTILE_PRECISION_SYSTEM_PARAM]: i18n.translate(
    'esqlLanguage.esql.autocomplete.geotilePrecisionSystemParam',
    { defaultMessage: 'The geotile precision for the current map zoom level' }
  ),
  [GEOHEX_PRECISION_SYSTEM_PARAM]: i18n.translate(
    'esqlLanguage.esql.autocomplete.geohexPrecisionSystemParam',
    { defaultMessage: 'The geohex (H3) resolution for the current map zoom level' }
  ),
  [GEOHASH_PRECISION_SYSTEM_PARAM]: i18n.translate(
    'esqlLanguage.esql.autocomplete.geohashPrecisionSystemParam',
    { defaultMessage: 'The geohash precision for the current map zoom level' }
  ),
};

export function getGeoPrecisionLiterals(systemParam: string, options?: DateLiteralsOptions) {
  return buildConstantsDefinitions(
    [systemParam],
    i18n.translate('esqlLanguage.esql.autocomplete.namedParamGeoPrecisionDefinition', {
      defaultMessage: 'Bind to map zoom level',
    }),
    options,
    i18n.translate('esqlLanguage.esql.autocomplete.geoPrecisionNamedParamDoc', {
      defaultMessage: `Use the \`{param}\` parameter to bind the precision to the zoom level of the map.`,
      values: { param: systemParam },
    }),
    SuggestionCategory.GEO_PRECISION_PARAM
  );
}

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
        i18n.translate('esqlLanguage.esql.autocomplete.constantDefinition', {
          defaultMessage: `Constant`,
        }),
      ...(documentationValue ? { documentation: { value: documentationValue } } : {}),
      ...(category && { category }),
    };

    return options?.advanceCursorAndOpenSuggestions ? withAutoSuggest(suggestion) : suggestion;
  });

export function getDateLiterals(options?: DateLiteralsOptions) {
  return [
    ...buildConstantsDefinitions(
      TIME_SYSTEM_PARAMS,
      i18n.translate('esqlLanguage.esql.autocomplete.namedParamTimeFilterDefinition', {
        defaultMessage: 'Bind to time filter',
      }),
      options,
      // appears when the user opens the second level popover
      i18n.translate('esqlLanguage.esql.autocomplete.timeNamedParamDoc', {
        defaultMessage: `Use the \`?_tstart\` and \`?_tend\` parameters to bind a custom timestamp field to Kibana's time filter.`,
      }),
      SuggestionCategory.TIME_PARAM
    ),
    {
      label: i18n.translate('esqlLanguage.esql.autocomplete.chooseFromTimePickerLabel', {
        defaultMessage: 'Choose from the time picker',
      }),
      text: '',
      kind: 'Issue',
      detail: i18n.translate('esqlLanguage.esql.autocomplete.chooseFromTimePicker', {
        defaultMessage: 'Click to choose',
      }),
      category: SuggestionCategory.CUSTOM_ACTION,
      command: {
        id: 'esql.timepicker.choose',
        title: i18n.translate('esqlLanguage.esql.autocomplete.chooseFromTimePicker', {
          defaultMessage: 'Click to choose',
        }),
      },
    } as ISuggestionItem,
  ];
}

export function getUnitDuration(unit: number = 1) {
  return timeUnitsToSuggest.map(({ name }) => `${unit} ${name}`);
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
      ...buildConstantsDefinitions(getUnitDuration(1), undefined, options),
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

  if (types.includes('boolean')) {
    suggestions.push(...buildConstantsDefinitions(['true', 'false'], undefined, options));
  }

  return suggestions;
}
