/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SerializableRecord } from '@kbn/utility-types';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AggConfigSerialized, IAggConfigs } from '../../../public';
import { Query } from '../..';
import { Filter } from '../../es_query';
import { IndexPattern } from '../..';
import type { SearchSource } from './search_source';

/**
 * search source interface
 * @public
 */
export type ISearchSource = Pick<SearchSource, keyof SearchSource>;

/**
 * high level search service
 * @public
 */
export interface ISearchStartSearchSource
  extends PersistableStateService<SerializedSearchSourceFields> {
  /**
   * creates {@link SearchSource} based on provided serialized {@link SearchSourceFields}
   * @param fields
   */
  create: (fields?: SerializedSearchSourceFields) => Promise<ISearchSource>;
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SortDirectionFormat = {
  order: SortDirection;
  format?: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SortDirectionNumeric = {
  order: SortDirection;
  numeric_type?: 'double' | 'long' | 'date' | 'date_nanos';
};

export type EsQuerySortValue = Record<
  string,
  SortDirection | SortDirectionNumeric | SortDirectionFormat
>;

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
  trackTotalHits?: boolean | number;
  /**
   * {@link AggConfigs}
   */
  aggs?: object | IAggConfigs | (() => object);
  from?: number;
  size?: number;
  source?: boolean | estypes.Fields;
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
  fieldsFromSource?: estypes.Fields;
  /**
   * {@link IndexPatternService}
   */
  index?: IndexPattern;
  searchAfter?: EsQuerySearchAfter;
  timeout?: string;
  terminate_after?: number;

  parent?: SearchSourceFields;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedSearchSourceFields = {
  type?: string;
  /**
   * {@link Query}
   */
  query?: Query;
  /**
   * {@link Filter}
   */
  filter?: Filter[];
  /**
   * {@link EsQuerySortValue}
   */
  sort?: EsQuerySortValue[];
  highlight?: SerializableRecord;
  highlightAll?: boolean;
  trackTotalHits?: boolean | number;
  // todo: needs aggconfigs serializable type
  /**
   * {@link AggConfigs}
   */
  aggs?: AggConfigSerialized[];
  from?: number;
  size?: number;
  source?: boolean | estypes.Fields;
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
  fieldsFromSource?: estypes.Fields;
  /**
   * {@link IndexPatternService}
   */
  index?: string;
  searchAfter?: EsQuerySearchAfter;
  timeout?: string;
  terminate_after?: number;

  parent?: SerializedSearchSourceFields;
};

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
    lang?: estypes.ScriptLanguage;
    script?: string;
    script_stack?: string[];
    type: string;
  };
  shard: number;
}
