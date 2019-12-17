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
import { NameList } from 'elasticsearch';
import { IIndexPattern } from 'src/plugins/data/public';
import { esFilters, Query } from '../../../../../plugins/data/public';

export type EsQuerySearchAfter = [string | number, string | number];

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export type EsQuerySortValue = Record<string, SortDirection>;

export interface SearchSourceFields {
  type?: string;
  query?: Query;
  filter?:
    | esFilters.Filter[]
    | esFilters.Filter
    | (() => esFilters.Filter[] | esFilters.Filter | undefined);
  sort?: EsQuerySortValue | EsQuerySortValue[];
  highlight?: any;
  highlightAll?: boolean;
  aggs?: any;
  from?: number;
  size?: number;
  source?: NameList;
  version?: boolean;
  fields?: NameList;
  index?: IIndexPattern;
  searchAfter?: EsQuerySearchAfter;
}

export interface SearchSourceOptions {
  callParentStartHandlers?: boolean;
}

export { SearchSourceContract } from './search_source';

export interface SortOptions {
  mode?: 'min' | 'max' | 'sum' | 'avg' | 'median';
  type?: 'double' | 'long' | 'date' | 'date_nanos';
  nested?: object;
  unmapped_type?: string;
  distance_type?: 'arc' | 'plane';
  unit?: string;
  ignore_unmapped?: boolean;
  _script?: object;
}

export interface Request {
  docvalue_fields: string[];
  _source: unknown;
  query: unknown;
  script_fields: unknown;
  sort: unknown;
  stored_fields: string[];
}

export interface ResponseWithShardFailure {
  _shards: {
    failed: number;
    failures: ShardFailure[];
    skipped: number;
    successful: number;
    total: number;
  };
}

export interface ShardFailure {
  index: string;
  node: string;
  reason: {
    caused_by: {
      reason: string;
      type: string;
    };
    reason: string;
    lang?: string;
    script?: string;
    script_stack?: string[];
    type: string;
  };
  shard: number;
}

export type SearchRequest = any;
export type SearchResponse = any;
