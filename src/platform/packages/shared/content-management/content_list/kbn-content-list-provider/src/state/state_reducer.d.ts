/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListClientState, ContentListAction } from './types';
/**
 * Default selection state.
 */
export declare const DEFAULT_SELECTION: {
  selectedIds: string[];
};
/**
 * State reducer for client-controlled state.
 *
 * Handles user-driven state mutations (query text, sort, pagination, selection).
 * Query data (items, loading, error) is managed by React Query directly.
 *
 * Selection is cleared whenever the query text, sort, or pagination changes so that
 * `selectedIds` never references items the user can no longer see.
 */
export declare const reducer: (
  state: ContentListClientState,
  action: ContentListAction
) => ContentListClientState;
