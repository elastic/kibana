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
export type SortFilterProps = Record<string, never>;

/**
 * Props for the {@link TagFilter} declarative component.
 *
 * Note: `TagFilter` is a non-rendering declarative component whose props are
 * parsed as attributes during filter resolution. Because `EuiSearchBar`
 * instantiates `custom_component` filters itself, attributes cannot be
 * forwarded to the underlying {@link TagFilterRenderer}. Extend this interface
 * only with props the `resolve` callback can act on directly.
 */
export type TagFilterProps = Record<string, never>;

/** Preset-to-props mapping for toolbar filters. */
export interface FilterPresets {
  sort: SortFilterProps;
  tags: TagFilterProps;
}

/** Context passed to filter `resolve` callbacks. */
export interface FilterContext {
  /** Whether sorting is available from the provider. */
  hasSorting: boolean;
  /** Whether tags filtering is available from the provider. */
  hasTags: boolean;
}

/** Part factory for toolbar filters. */
export const filter = toolbar.definePart<FilterPresets, SearchFilterConfig, FilterContext>({
  name: 'filter',
});

/** Part factory for the toolbar filters container (no presets). */
export const filtersPart = toolbar.definePart({ name: 'filters' });
