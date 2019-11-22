/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import { esFilters } from '../../../../../common';

const getScriptedPhraseValue = (filter: esFilters.PhraseFilter) =>
  get(filter, ['script', 'script', 'params', 'value']);

const getFormattedValueFn = (value: any) => {
  return (formatter?: esFilters.FilterValueFormatter) => {
    return formatter ? formatter.convert(value) : value;
  };
};

const getParams = (filter: esFilters.PhraseFilter) => {
  const scriptedPhraseValue = getScriptedPhraseValue(filter);
  const isScriptedFilter = Boolean(scriptedPhraseValue);
  const key = isScriptedFilter ? filter.meta.field || '' : esFilters.getPhraseFilterField(filter);
  const query = scriptedPhraseValue || esFilters.getPhraseFilterValue(filter);
  const params = { query };

  return {
    key,
    params,
    type: esFilters.FILTERS.PHRASE,
    value: getFormattedValueFn(query),
  };
};

export const isMapPhraseFilter = (filter: any): filter is esFilters.PhraseFilter =>
  esFilters.isPhraseFilter(filter) || esFilters.isScriptedPhraseFilter(filter);

export const mapPhrase = (filter: esFilters.Filter) => {
  if (!isMapPhraseFilter(filter)) {
    throw filter;
  }

  return getParams(filter);
};
