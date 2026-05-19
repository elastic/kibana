/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseContentListFiltersReturn } from './types';
/**
 * Hook to read the current filter state and clear all filters.
 *
 * Derives `ActiveFilters` from `queryText` via `useActiveFilters`.
 *
 * `clearFilters` strips structured filter/flag clauses from `queryText`
 * while preserving free-text search. For example, clearing
 * `"tag:production is:starred my search"` yields `"my search"`.
 *
 * @returns A {@link UseContentListFiltersReturn} object.
 */
export declare const useContentListFilters: () => UseContentListFiltersReturn;
