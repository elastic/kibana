/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NameList } from 'elasticsearch';
import { Query } from '../..';
import { Filter } from '../../es_query';
import { IndexPattern } from '../../index_patterns';
import { SearchSource } from './search_source';

/**
 * search source interface
 * @public
 */
export type ISearchSource = Pick<SearchSource, keyof SearchSource>;

/**
 * high level search service
 * @public
 */
export interface ISearchStartSearchSource {
  /**
   * creates {@link SearchSource} based on provided serialized {@link SearchSourceFields}
   * @param fields
   */
  create: (fields?: SearchSourceFields) => Promise<ISearchSource>;
  /**
   * creates empty {@link SearchSource}
   */
  createEmpty: () => ISearchSource;
}

export type EsQuerySearchAfter = [string | number, string | number];

export enum SortDirection {
  asc = 'asc',
  desc = 'desc',
}

export interface SortDirectionNumeric {
  order: SortDirection;
  numeric_type?: 'double' | 'long' | 'date' | 'date_nanos';
}

export type EsQuerySortValue = Record<string, SortDirection | SortDirectionNumeric>;

interface SearchField {
  [key: string]: SearchFieldValue;
}

// @internal
export type SearchFieldValue = string | SearchField;

/**
 * search source fields
 */
export interface SearchSourceFields {
  type?: string;
  /**
   * {@link Query}
   */
  query?: Query;
  /**
   * {@link Filter}
   */
  filter?: Filter[] | Filter | (() => Filter[] | Filter | undefined);
  /**
   * {@link EsQuerySortValue}
   */
  sort?: EsQuerySortValue | EsQuerySortValue[];
  highlight?: any;
  highlightAll?: boolean;
  /**
   * {@link AggConfigs}
   */
  aggs?: any;
  from?: number;
  size?: number;
  source?: NameList;
  version?: boolean;
  /**
   * Retrieve fields via the search Fields API
   */
  fields?: SearchFieldValue[];
  /**
   * Retreive fields directly from _source (legacy behavior)
   *
   * @deprecated It is recommended to use `fields` wherever possible.
   */
  fieldsFromSource?: NameList;
  /**
   * {@link IndexPatternService}
   */
  index?: IndexPattern;
  searchAfter?: EsQuerySearchAfter;
  timeout?: string;
  terminate_after?: number;

  parent?: SearchSourceFields;
}

export interface SearchSourceOptions {
  callParentStartHandlers?: boolean;
}

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
