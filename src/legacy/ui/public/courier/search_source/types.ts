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
import { Filter } from '@kbn/es-query';
import { Query } from '../../../../../plugins/data/common/query';
import { IndexPattern } from '../../../../core_plugins/data/public/index_patterns';

export type EsQuerySearchAfter = [string | number, string | number];

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export type EsQuerySortValue = Record<string, SortDirection>;

export interface SearchSourceFields {
  type?: string;
  query?: Query;
  filter?: Filter[] | Filter;
  sort?: EsQuerySortValue | EsQuerySortValue[];
  highlight?: any;
  highlightAll?: boolean;
  aggs?: any;
  from?: number;
  size?: number;
  source?: any;
  version?: boolean;
  fields?: string[];
  index?: IndexPattern;
  searchAfter?: EsQuerySearchAfter;
}

export interface SearchSourceOptions {
  callParentStartHandlers?: boolean;
}

export { SearchSourceContract } from './search_source';
