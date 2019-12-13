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

import { Filter, FilterMeta } from './meta_filter';
import { getPhraseScript } from './phrase_filter';
import { FILTERS } from './index';
import { IIndexPattern, IFieldType } from '../../index_patterns';

export type PhrasesFilterMeta = FilterMeta & {
  params: string[]; // The unformatted values
  field?: string;
};

export type PhrasesFilter = Filter & {
  meta: PhrasesFilterMeta;
};

export const isPhrasesFilter = (filter: any): filter is PhrasesFilter =>
  filter?.meta?.type === FILTERS.PHRASES;

export const getPhrasesFilterField = (filter: PhrasesFilter) => {
  // Phrases is a newer filter type that has always been created via a constructor that ensures
  // `meta.key` is set to the field name
  return filter.meta.key;
};

// Creates a filter where the given field matches one or more of the given values
// params should be an array of values
export const buildPhrasesFilter = (field: IFieldType, params: any, indexPattern: IIndexPattern) => {
  const index = indexPattern.id;
  const type = FILTERS.PHRASES;
  const key = field.name;

  const format = (f: IFieldType, value: any) =>
    f && f.format && f.format.convert ? f.format.convert(value) : value;

  const value = params.map((v: any) => format(field, v)).join(', ');

  let should;
  if (field.scripted) {
    should = params.map((v: any) => ({
      script: getPhraseScript(field, v),
    }));
  } else {
    should = params.map((v: any) => ({
      match_phrase: {
        [field.name]: v,
      },
    }));
  }

  return {
    meta: { index, type, key, value, params },
    query: {
      bool: {
        should,
        minimum_should_match: 1,
      },
    },
  } as PhrasesFilter;
};
