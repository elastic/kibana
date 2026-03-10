/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter } from '../part';
import { CreatedByRenderer } from './created_by_renderer';

/**
 * Props for the `Filters.CreatedBy` declarative component.
 *
 * Note: `CreatedByFilter` is a non-rendering declarative component whose
 * props are parsed as attributes during filter resolution. Because `EuiSearchBar`
 * instantiates `custom_component` filters itself, attributes cannot be forwarded
 * to the underlying {@link CreatedByRenderer}.
 */
export type CreatedByFilterProps = Record<string, never>;

/**
 * `CreatedByFilter` declarative component (non-rendering).
 *
 * Specifies that a "Created by" filter popover should appear in the toolbar.
 * The `resolve` callback checks whether user profile filtering is available
 * and returns a `SearchFilterConfig` wrapping {@link CreatedByRenderer}, or
 * `undefined` to skip the filter entirely.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.CreatedBy />
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export const CreatedByFilter = filter.createPreset({
  name: 'createdBy',
  resolve: (_attributes, { hasCreatedBy }) => {
    if (!hasCreatedBy) {
      return undefined;
    }
    return { type: 'custom_component', component: CreatedByRenderer };
  },
});
