/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMarkerComponent } from '../../marker_factory';

/**
 * Props for the {@link SortFilter} marker component.
 */
export interface SortFilterProps {
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `SortFilter` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It specifies that a sort dropdown should appear in the search bar filters.
 * The props are extracted by {@link parseFiltersFromChildren}.
 *
 * Sort options are configured via the provider's `sorting` config.
 * Uses `EuiSearchBar`'s `custom_component` filter type.
 *
 * @param _props - The component props. See {@link SortFilterProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export const SortFilter = createMarkerComponent<SortFilterProps>('SortFilter');
