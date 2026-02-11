/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { filtersPart } from './part';
import { SortFilter } from './sort';

/**
 * Props for the {@link Filters} container component.
 */
export interface FiltersProps {
  /** Filter declarative components as children. */
  children?: ReactNode;
}

/**
 * `Filters` container component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It groups filter declarative components as children to define the order
 * and configuration of filters in the toolbar.
 * The props are extracted by {@link useFilters}.
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
 *     <Filters.Sort />
 *   </Filters>
 * </ContentListToolbar>
 * ```
 */
const FiltersComponent = filtersPart.createComponent<FiltersProps>();

// Attach sub-components via Object.assign for compound component pattern.
export const Filters = Object.assign(FiltersComponent, {
  Sort: SortFilter,
});
