/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActiveFilters } from '../../datasource';

/**
 * Return type for the {@link useContentListFilters} hook.
 */
export interface UseContentListFiltersReturn {
  /** Currently active filters (derived from query text and state). */
  filters: ActiveFilters;
  /** Clear all filter and flag clauses from `queryText`, preserving free-text search. */
  clearFilters: () => void;
}
