/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
/**
 * Hook to parse and build toolbar filters from declarative children.
 *
 * Encapsulates the full filter resolution flow:
 * 1. Extract `<Filters>` children from the toolbar's children.
 * 2. Parse declarative `Filter` presets via `filter.parseChildren`.
 * 3. Resolve `SearchFilterConfig` objects via `filter.resolve`.
 * 4. Fall back to default filters (tags + sort) if none are found.
 *
 * @param children - React children from the toolbar component.
 * @returns Array of EUI search filter configs ready for `EuiSearchBar`.
 */
export declare const useFilters: (children: ReactNode) => SearchFilterConfig[];
