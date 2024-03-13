/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';

export enum FetchStatus {
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading',
  LOADING_MORE = 'loading_more',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export interface RecordsFetchResponse {
  records: DataTableRecord[];
  textBasedQueryColumns?: DatatableColumn[];
  textBasedHeaderWarning?: string;
  interceptedWarnings?: SearchResponseWarning[];
}

export interface SidebarToggleState {
  isCollapsed: boolean;
  toggle: undefined | ((isCollapsed: boolean) => void);
}
