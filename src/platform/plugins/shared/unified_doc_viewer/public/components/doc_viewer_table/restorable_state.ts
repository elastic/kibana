/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRestorableStateProvider } from '@kbn/restorable-state';

export interface DocViewerTableRestorableState {
  // Main search input value
  searchTerm: string;
  // Array of field type filters (date, keyword, text, etc.)
  fieldTypeFilters: string[];
  // Whether null values are hidden in the table
  hideNullValues: boolean;
  // Whether to show only selected fields in the table
  showOnlySelectedFields: boolean;
  // Array of pinned field names
  pinnedFields: string[];
  // Current vertical scroll position
  scrollTop: number;
}

export const {
  withRestorableState,
  useRestorableState,
  useRestorableRef,
  useRestorableLocalStorage,
} = createRestorableStateProvider<DocViewerTableRestorableState>();
