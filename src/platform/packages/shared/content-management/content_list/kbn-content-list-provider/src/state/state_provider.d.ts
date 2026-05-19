/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ReactNode } from 'react';
/**
 * Props for `ContentListStateProvider`.
 */
export interface ContentListStateProviderProps {
  /** Child components that will have access to the state context. */
  children: ReactNode;
}
/**
 * Internal provider component that manages the runtime state of the content list.
 *
 * This provider:
 * - Manages client-controlled state (search, filters, sort, pagination, selection) via reducer.
 * - Uses React Query for data fetching with caching and deduplication.
 * - Combines client state with query data for a unified state interface.
 *
 * Note: Initial state is derived from `features.sorting`, `features.pagination`, and
 * `features.search` at mount and not updated if configuration changes.
 * See {@link ContentListProvider} for details.
 *
 * @internal This is automatically included when using `ContentListProvider`.
 */
export declare const ContentListStateProvider: ({
  children,
}: ContentListStateProviderProps) => React.JSX.Element;
