/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter } from '../part';
import { StarredFilterRenderer } from './starred_filter_renderer';

// Re-export the props type for consumers.
export type { StarredFilterProps } from '../part';

/**
 * `StarredFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a starred toggle should appear in the toolbar filters.
 * The `resolve` callback checks whether starred is available and returns
 * a `SearchFilterConfig` wrapping {@link StarredFilterRenderer}, or `undefined`
 * to skip the filter entirely.
 *
 * Starred must be enabled via the provider's `services.favorites` configuration.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Starred />
 *   <Filters.Tags />
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export const StarredFilter = filter.createPreset({
  name: 'starred',
  resolve: (_attributes, { hasStarred }) => {
    if (!hasStarred) {
      return undefined;
    }
    return { type: 'custom_component', component: StarredFilterRenderer };
  },
});
