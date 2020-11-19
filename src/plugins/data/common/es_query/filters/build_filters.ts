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

import { IIndexPattern, IFieldType } from '../..';
import {
  Filter,
  FILTERS,
  FilterStateStore,
  FilterMeta,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
  buildExistsFilter,
} from '.';

export function buildFilter(
  indexPattern: IIndexPattern,
  field: IFieldType,
  type: FILTERS,
  negate: boolean,
  disabled: boolean,
  params: any,
  alias: string | null,
  store: FilterStateStore
): Filter {
  const filter = buildBaseFilter(indexPattern, field, type, params);
  filter.meta.alias = alias;
  filter.meta.negate = negate;
  filter.meta.disabled = disabled;
  filter.$state = { store };
  return filter;
}

export function buildCustomFilter(
  indexPatternString: string,
  queryDsl: any,
  disabled: boolean,
  negate: boolean,
  alias: string | null,
  store: FilterStateStore
): Filter {
  const meta: FilterMeta = {
    index: indexPatternString,
    type: FILTERS.CUSTOM,
    disabled,
    negate,
    alias,
  };
  const filter: Filter = { ...queryDsl, meta };
  filter.$state = { store };
  return filter;
}

function buildBaseFilter(
  indexPattern: IIndexPattern,
  field: IFieldType,
  type: FILTERS,
  params: any
): Filter {
  switch (type) {
    case 'phrase':
      return buildPhraseFilter(field, params, indexPattern);
    case 'phrases':
      return buildPhrasesFilter(field, params, indexPattern);
    case 'range':
      const newParams = { gte: params.from, lt: params.to };
      return buildRangeFilter(field, newParams, indexPattern);
    case 'exists':
      return buildExistsFilter(field, indexPattern);
    default:
      throw new Error(`Unknown filter type: ${type}`);
  }
}
