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
 * Props for the {@link CreatedByFilter} marker component.
 */
export interface CreatedByFilterProps {
  /**
   * Whether to include the "No creators" option in the filter.
   * When `true`, items without a creator can be filtered.
   *
   * @default true
   */
  showNoUserOption?: boolean;
  /**
   * Whether Kibana versioning is enabled. Used to display appropriate help text.
   *
   * @default false
   */
  isKibanaVersioningEnabled?: boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `CreatedByFilter` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It specifies that a "Created by" user filter should appear in the search bar.
 * The props are extracted by {@link parseFiltersFromChildren}.
 *
 * Features:
 * - User profile picker with avatars.
 * - Async user profile loading.
 * - Include/exclude support.
 * - "No creators" option for items without a creator.
 *
 * Uses `EuiSearchBar`'s `custom_component` filter type to preserve `UserProfilesPopover`.
 *
 * @param _props - The component props. See {@link CreatedByFilterProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.CreatedBy showNoUserOption={true} />
 * </Filters>
 * ```
 */
export const CreatedByFilter = createMarkerComponent<CreatedByFilterProps>('CreatedByFilter');
