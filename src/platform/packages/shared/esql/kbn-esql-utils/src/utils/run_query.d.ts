/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ProjectRouting, TimeRange } from '@kbn/es-query';
import type { ESQLColumn, ESQLSearchResponse, ESQLSearchParams } from '@kbn/es-types';
import { type ESQLControlVariable } from '@kbn/esql-types';
export declare const hasStartEndParams: (query: string) => boolean;
export declare const getStartEndParams: (
  query: string,
  time?: TimeRange
) => (
  | {
      _tstart: string;
      _tend?: undefined;
    }
  | {
      _tstart?: undefined;
      _tend: string;
    }
)[];
export declare const getNamedParams: (
  query: string,
  timeRange?: TimeRange,
  variables?: ESQLControlVariable[]
) => Record<
  string,
  string | number | (string | number)[] | Record<string, string | number> | undefined
>[];
export declare function formatESQLColumns(columns: ESQLColumn[]): DatatableColumn[];
export declare function getESQLQueryColumnsRaw({
  esqlQuery,
  search,
  signal,
  filter,
  dropNullColumns,
  timeRange,
  variables,
  includeColumnMetadata,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  dropNullColumns?: boolean;
  filter?: unknown;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  includeColumnMetadata?: boolean;
}): Promise<ESQLColumn[]>;
export declare function getESQLQueryColumns({
  esqlQuery,
  search,
  signal,
  filter,
  dropNullColumns,
  timeRange,
  variables,
  includeColumnMetadata,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  filter?: unknown;
  dropNullColumns?: boolean;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  includeColumnMetadata?: boolean;
}): Promise<DatatableColumn[]>;
export declare function getESQLResults({
  esqlQuery,
  search,
  signal,
  filter,
  dropNullColumns,
  timeRange,
  variables,
  timezone,
  executionContext,
  approximation,
  projectRouting,
  includeColumnMetadata,
}: {
  esqlQuery: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  filter?: unknown;
  dropNullColumns?: boolean;
  timeRange?: TimeRange;
  variables?: ESQLControlVariable[];
  timezone?: string;
  executionContext?: KibanaExecutionContext;
  approximation?: boolean;
  projectRouting?: ProjectRouting;
  includeColumnMetadata?: boolean;
}): Promise<{
  response: ESQLSearchResponse;
  params: ESQLSearchParams;
}>;
