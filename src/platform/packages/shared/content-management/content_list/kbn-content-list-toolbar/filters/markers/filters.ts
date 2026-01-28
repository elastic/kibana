/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { createMarkerComponent } from '../../marker_factory';
import { StarredFilter } from './starred';
import { SortFilter } from './sort';
import { TagsFilter } from './tags';
import { CreatedByFilter } from './created_by';
import { Filter } from './filter';

/**
 * Props for the {@link Filters} container component.
 */
export interface FiltersProps {
  /** Filter marker components as children. */
  children?: ReactNode;
}

/**
 * `Filters` container component (non-rendering marker).
 *
 * This is a declarative marker component that doesn't render anything.
 * It groups filter configuration markers as children to define the order
 * and configuration of filters in `EuiSearchBar`.
 * The props are extracted by {@link parseFiltersFromChildren}.
 *
 * @param _props - The component props. See {@link FiltersProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * const { Filters } = ContentListToolbar;
 *
 * <ContentListToolbar>
 *   <Filters>
 *     <Filters.Starred />
 *     <Filters.Sort />
 *     <Filters.Tags tagManagementUrl="/app/tags" />
 *     <Filters.CreatedBy />
 *     <Filters.Filter field="status" />
 *   </Filters>
 * </ContentListToolbar>
 * ```
 */
const FiltersComponent = createMarkerComponent<FiltersProps>('Filters');

// Attach sub-components via Object.assign for compound component pattern.
export const Filters = Object.assign(FiltersComponent, {
  Starred: StarredFilter,
  Sort: SortFilter,
  Tags: TagsFilter,
  CreatedBy: CreatedByFilter,
  Filter,
});
