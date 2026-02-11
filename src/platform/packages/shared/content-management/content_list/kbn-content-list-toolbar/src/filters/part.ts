/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchFilterConfig } from '@elastic/eui';
import { toolbar } from '../assembly';

/**
 * Props for the {@link SortFilter} declarative component.
 *
 * Note: `SortFilter` is a non-rendering declarative component whose props are
 * parsed as attributes during filter resolution. Because `EuiSearchBar`
 * instantiates `custom_component` filters itself, attributes cannot be
 * forwarded to the underlying {@link SortRenderer}. Extend this interface
 * only with props the `resolve` callback can act on directly.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SortFilterProps {}

/** Preset-to-props mapping for toolbar filters. */
export interface FilterPresets {
  sort: SortFilterProps;
}

/**
 * Runtime context passed to filter `resolve` callbacks.
 *
 * Assembled from hooks in `useFilters` and forwarded to each
 * preset's resolver so it can decide whether to render.
 */
export interface FilterContext {
  /** Whether sorting is available from the provider. */
  hasSorting: boolean;
}

/** Part factory for toolbar filters. */
export const filter = toolbar.definePart<FilterPresets, SearchFilterConfig, FilterContext>({
  name: 'filter',
});

/** Part factory for the toolbar filters container (no presets). */
export const filtersPart = toolbar.definePart({ name: 'filters' });
