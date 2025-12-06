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
 * Props for the {@link TagsFilter} marker component.
 */
export interface TagsFilterProps {
  /** URL to the tag management page. If provided, shows "Manage tags" link in the popover. */
  tagManagementUrl?: string;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `TagsFilter` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It specifies that a tags filter should appear in the search bar.
 * The props are extracted by {@link parseFiltersFromChildren}.
 *
 * Features:
 * - Multi-select with include/exclude support (Cmd+click to exclude).
 * - Tag counts per option.
 * - Search within the popover.
 * - Colored tag badges.
 * - Optional "Manage tags" link.
 *
 * Uses `EuiSearchBar`'s `custom_component` filter type to preserve rich functionality.
 *
 * @param _props - The component props. See {@link TagsFilterProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Tags tagManagementUrl="/app/management/tags" />
 * </Filters>
 * ```
 */
export const TagsFilter = createMarkerComponent<TagsFilterProps>('TagsFilter');
