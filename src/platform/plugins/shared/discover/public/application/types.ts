/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';

export enum FetchStatus {
  // the data fetching is in the setup phase, no request has been sent yet
  SETUP = 'setup',
  // the data fetching has not started yet, it's just being used when discover:searchOnPageLoad is set to false
  // Discover then doesn't start the data fetching on page load initially
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading',
  LOADING_MORE = 'loading_more',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export interface RecordsFetchResponse {
  records: DataTableRecord[];
  esqlQueryColumns?: DatatableColumn[];
  esqlHeaderWarning?: string;
  interceptedWarnings?: SearchResponseWarning[];
}

export interface SidebarToggleState {
  isCollapsed: boolean;
  toggle: undefined | ((isCollapsed: boolean) => void);
}
