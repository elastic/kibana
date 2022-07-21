/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import {
  PhraseFilter,
  getPhraseFilterValue,
  getPhraseFilterField,
  FILTERS,
  isScriptedPhraseFilter,
  Filter,
  isPhraseFilter,
} from '@kbn/es-query';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

const getScriptedPhraseValue = (filter: PhraseFilter) =>
  get(filter, ['query', 'script', 'script', 'params', 'value']);

export function getPhraseDisplayValue(filter: PhraseFilter, formatter?: FieldFormat) {
  return formatter?.convert(filter.meta.value) ?? filter.meta.value ?? '';
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
    value: query,
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
