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
import { IIndexPattern, IFieldType } from '../../index_patterns';

export type ExistsFilterMeta = FilterMeta;

export interface FilterExistsProperty {
  field: any;
}

export type ExistsFilter = Filter & {
  meta: ExistsFilterMeta;
  exists?: FilterExistsProperty;
};

export const isExistsFilter = (filter: any): filter is ExistsFilter => filter && filter.exists;

export const getExistsFilterField = (filter: ExistsFilter) => {
  return filter.exists && filter.exists.field;
};

export const buildExistsFilter = (field: IFieldType, indexPattern: IIndexPattern) => {
  return {
    meta: {
      index: indexPattern.id,
    },
    exists: {
      field: field.name,
    },
  } as ExistsFilter;
};
