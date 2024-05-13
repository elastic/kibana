/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { Query, AggregateQuery } from '@kbn/es-query';
import { SerializableRecord } from '@kbn/utility-types';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AggConfigSerialized, IAggConfigs, ISearchOptions } from '../../../public';
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
  query?: Query | AggregateQuery;
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
  index?: DataView;
  timeout?: string;
  terminate_after?: number;
  searchAfter?: estypes.SortResults;
  /**
   * Allow querying to use a point-in-time ID for paging results
   */
  pit?: estypes.SearchPointInTimeReference;

  parent?: SearchSourceFields;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedSearchSourceFields = {
  type?: string;
  /**
   * {@link Query}
   */
  query?: Query | AggregateQuery;
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
  index?: string | DataViewSpec;
  searchAfter?: estypes.SortResults;
  timeout?: string;
  terminate_after?: number;

  parent?: SerializedSearchSourceFields;
};

export interface SearchSourceOptions {
  callParentStartHandlers?: boolean;
}

export function isSerializedSearchSource(
  maybeSerializedSearchSource: unknown
): maybeSerializedSearchSource is SerializedSearchSourceFields {
  return (
    typeof maybeSerializedSearchSource === 'object' &&
    maybeSerializedSearchSource !== null &&
    !Array.isArray(maybeSerializedSearchSource)
  );
}

export interface IInspectorInfo {
  adapter?: RequestAdapter;
  title: string;
  id?: string;
  description?: string;
}

export interface SearchSourceSearchOptions extends ISearchOptions {
  /**
   * Inspector integration options
   */
  inspector?: IInspectorInfo;

  /**
   * Set to true to disable warning toasts and customize warning display
   */
  disableWarningToasts?: boolean;
}
