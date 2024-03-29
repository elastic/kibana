/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter, PhraseFilter, ScriptedPhraseFilter } from '@kbn/es-query';
import { get } from 'lodash';
import {
  getPhraseFilterValue,
  getPhraseFilterField,
  FILTERS,
  isScriptedPhraseFilter,
  isPhraseFilter,
} from '@kbn/es-query';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

const getScriptedPhraseValue = (filter: PhraseFilter) =>
  get(filter, ['query', 'script', 'script', 'params', 'value']);

export function getPhraseDisplayValue(
  filter: PhraseFilter | ScriptedPhraseFilter,
  formatter?: FieldFormat,
  fieldType?: string
): string {
  const value = filter.meta.value ?? filter.meta.params?.query;
  const updatedValue = fieldType === 'number' && !value ? 0 : value;
  if (formatter?.convert) {
    return formatter.convert(updatedValue);
  }
  return updatedValue === undefined ? '' : `${updatedValue}`;
}

const getParams = (filter: PhraseFilter) => {
  const scriptedPhraseValue = getScriptedPhraseValue(filter);
  const isScriptedFilter = Boolean(scriptedPhraseValue);
  const key = isScriptedFilter ? filter.meta.field || '' : getPhraseFilterField(filter);
  const query = scriptedPhraseValue || getPhraseFilterValue(filter);
  const params = { query };

  return {
    key,
    params,
    type: FILTERS.PHRASE,
  };
};

export const isMapPhraseFilter = (filter: any): filter is PhraseFilter =>
  isPhraseFilter(filter) || isScriptedPhraseFilter(filter);

export const mapPhrase = (filter: Filter) => {
  if (!isMapPhraseFilter(filter)) {
    throw filter;
  }

  return getParams(filter);
};
