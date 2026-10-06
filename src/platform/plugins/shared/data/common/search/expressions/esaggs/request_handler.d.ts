/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, ProjectRouting, TimeRange } from '@kbn/es-query';
import type { Query } from '../../..';
import type { IAggConfigs } from '../../aggs';
import type { ISearchStartSearchSource } from '../../search_source';
export interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  aggs: IAggConfigs;
  filters?: Filter[];
  indexPattern?: DataView;
  inspectorAdapters: Adapters;
  query?: Query;
  searchSessionId?: string;
  searchSourceService: ISearchStartSearchSource;
  timeFields?: string[];
  timeRange?: TimeRange;
  disableWarningToasts?: boolean;
  getNow?: () => Date;
  executionContext?: KibanaExecutionContext;
  title?: string;
  description?: string;
  projectRouting?: ProjectRouting;
}
export declare const handleRequest: ({
  abortSignal,
  aggs,
  filters,
  indexPattern,
  inspectorAdapters,
  query,
  searchSessionId,
  searchSourceService,
  timeFields,
  timeRange,
  disableWarningToasts,
  getNow,
  executionContext,
  title,
  description,
  projectRouting,
}: RequestHandlerParams) => import('rxjs').Observable<
  import('@kbn/expressions-plugin/common').Datatable
>;
