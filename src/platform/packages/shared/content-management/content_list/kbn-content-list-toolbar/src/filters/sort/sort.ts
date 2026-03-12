/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter } from '../part';
import { SortRenderer } from './sort_renderer';

// Re-export the props type for consumers.
export type { SortFilterProps } from '../part';

/**
 * `SortFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a sort dropdown should appear in the toolbar filters.
 * The `resolve` callback checks whether sorting is available and returns
 * a `SearchFilterConfig` wrapping {@link SortRenderer}, or `undefined`
 * to skip the filter entirely.
 *
 * Sort options are configured via the provider's `sorting` config.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export const SortFilter = filter.createPreset({
  name: 'sort',
  resolve: (_attributes, { hasSorting }) => {
    if (!hasSorting) return undefined;
    return { type: 'custom_component', component: SortRenderer };
  },
});
