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
 * Props for the {@link StarredFilter} marker component.
 */
export interface StarredFilterProps {
  /** Custom label (default: "Starred"). */
  name?: string;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `StarredFilter` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It specifies that a starred toggle filter should appear in the search bar.
 * The props are extracted by {@link parseFiltersFromChildren}.
 *
 * Uses `EuiSearchBar`'s built-in `is` filter type for automatic query sync.
 * Toggling the filter adds/removes `is:starred` from the query text.
 *
 * @param _props - The component props. See {@link StarredFilterProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Starred />
 * </Filters>
 * ```
 */
export const StarredFilter = createMarkerComponent<StarredFilterProps>('StarredFilter');
