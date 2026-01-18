/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ISuggestionItem } from '../types';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { SuggestionCategory } from '../../../shared/sorting/types';

type PromqlParamValueType = 'timeseries_sources' | 'date_literals' | 'static';
type PromqlParamName = (typeof PROMQL_PARAMS)[number]['name'];

interface PromqlParamDefinition {
  name: string;
  description: string;
  valueType: PromqlParamValueType;
  suggestedValues?: string[];
}

const PROMQL_REQUIRED_PARAMS: PromqlParamName[] = ['step', 'start', 'end'];

const PROMQL_PARAMS: PromqlParamDefinition[] = [
  { name: 'index', description: 'Index pattern to query', valueType: 'timeseries_sources' },
  {
    name: 'step',
    description: 'Query resolution step (e.g. 1m, 5m, 1h)',
    valueType: 'static',
    suggestedValues: ['1m', '5m', '15m', '30m', '1h', '6h', '1d'],
  },
  { name: 'start', description: 'Range query start time', valueType: 'date_literals' },
  { name: 'end', description: 'Range query end time', valueType: 'date_literals' },
];

export const PROMQL_PARAM_NAMES: string[] = PROMQL_PARAMS.map((param) => param.name);

/* Finds param definition to check value type and get suggested values. */
export function getPromqlParam(name: string): PromqlParamDefinition | undefined {
  return PROMQL_PARAMS.find((param) => param.name === name);
}

/* Used to decide if col0 suggestion should be shown (only after required params). */
export function areRequiredPromqlParamsPresent(usedParams: Set<string>): boolean {
  return PROMQL_REQUIRED_PARAMS.every((param) => usedParams.has(param));
}

/* Type guard used in position detection to distinguish params from query tokens. */
export const isPromqlParamName = (name: string): name is PromqlParamName =>
  PROMQL_PARAM_NAMES.includes(name);

/*
 * Checks if text looks like a PROMQL param assignment (e.g. "index=" or "step = ").
 * Used to distinguish param text from query text.
 */
export function looksLikePromqlParamAssignment(text: string): boolean {
  const trimmed = text.trim().toLowerCase();

  if (trimmed.startsWith(',')) {
    return true;
  }

  return PROMQL_PARAM_NAMES.some((param) => {
    if (trimmed === param) {
      return true;
    }

    if (trimmed.startsWith(param)) {
      const afterParam = trimmed.substring(param.length).trimStart();
      return afterParam.startsWith('=');
    }

    return false;
  });
}

/* Used to filter already-used params from autocomplete suggestions. */
export function getUsedPromqlParamNames(commandText: string): Set<string> {
  const used = new Set<string>();
  const tokens = commandText.toLowerCase().split(/\s+/);

  for (const param of PROMQL_PARAM_NAMES) {
    if (tokens.some((token) => token === param || token.startsWith(`${param}=`))) {
      used.add(param);
    }
  }

  return used;
}

/* Builds suggestion items for param keys (index=, step=, start=, end=). */
export function getPromqlParamKeySuggestions(): ISuggestionItem[] {
  return PROMQL_PARAMS.map(({ name, description }) =>
    withAutoSuggest({
      label: name,
      text: `${name} = `,
      kind: 'Keyword',
      detail: i18n.translate(`kbn-esql-language.esql.autocomplete.promql.${name}ParamDoc`, {
        defaultMessage: description,
      }),
    })
  );
}

/* Builds suggestion items for param values (e.g. step durations like 1m, 5m). */
export function getPromqlParamValueSuggestions(param: string): ISuggestionItem[] {
  const definition = getPromqlParam(param);

  if (!definition?.suggestedValues) {
    return [];
  }

  return definition.suggestedValues.map((value) => ({
    label: value,
    text: value,
    kind: 'Value',
    detail: i18n.translate('kbn-esql-language.esql.autocomplete.promql.paramValueDoc', {
      defaultMessage: '{param} value',
      values: { param },
    }),
    category: SuggestionCategory.VALUE,
  }));
}
