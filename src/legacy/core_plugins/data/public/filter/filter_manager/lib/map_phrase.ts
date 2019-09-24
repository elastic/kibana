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
import { PhraseFilter, Filter } from '@kbn/es-query';
import { SavedObjectNotFound } from '../../../../../../../plugins/kibana_utils/public';
import { IndexPatterns, IndexPattern } from '../../../index_patterns';

const TYPE = 'phrase';

const getScriptedPhraseValue = (filter: PhraseFilter) =>
  get(filter, ['script', 'script', 'params', 'value']);

const getFormattedValue = (value: any, key: string, indexPattern?: IndexPattern) => {
  const formatter: any =
    indexPattern && key && get(indexPattern, ['fields', 'byName', key, 'format']);

  return formatter ? formatter.convert(value) : value;
};

const getParams = (filter: PhraseFilter, indexPattern?: IndexPattern) => {
  const scriptedPhraseValue = getScriptedPhraseValue(filter);
  const isScriptedPhraseFilter = Boolean(scriptedPhraseValue);
  const key = isScriptedPhraseFilter ? filter.meta.field || '' : Object.keys(filter.query.match)[0];
  const query = scriptedPhraseValue || get(filter, ['query', 'match', key, 'query']);
  const params = { query };

  return {
    key,
    params,
    type: TYPE,
    value: getFormattedValue(query, key, indexPattern),
  };
};

export const isMapPhraseFilter = (filter: any): filter is PhraseFilter =>
  filter && ((filter.query && filter.query.match) || getScriptedPhraseValue(filter));

export const mapPhrase = (indexPatterns: IndexPatterns) => {
  return async (filter: Filter) => {
    if (!isMapPhraseFilter(filter)) {
      throw filter;
    }

    try {
      let indexPattern;

      if (filter.meta.index) {
        indexPattern = await indexPatterns.get(filter.meta.index);
      }

      return getParams(filter, indexPattern);
    } catch (error) {
      if (error instanceof SavedObjectNotFound) {
        return getParams(filter);
      }
      throw error;
    }
  };
};
