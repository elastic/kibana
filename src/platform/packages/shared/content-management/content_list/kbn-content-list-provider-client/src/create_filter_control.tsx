/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentType } from 'react';
import { filter } from '@kbn/content-list-toolbar';
import { CustomFilterRenderer, type CustomFilterRendererProps } from './custom_filter_renderer';
import type { ResolvedContentListFilter } from './filters';

/** Options for {@link createFilterControl}. */
export interface CreateFilterControlOptions {
  /** Custom option renderer — see {@link CustomFilterRendererProps.renderOptionContent}. */
  renderOptionContent?: CustomFilterRendererProps['renderOptionContent'];
  /** `data-test-subj` for the filter popover button. */
  'data-test-subj'?: string;
}

/**
 * Builds a declarative toolbar control for a registered filter dimension.
 *
 * Registering a filter via `features.filters` powers KQL search and facet
 * counts; it does **not** render a toolbar control. Call this to obtain a
 * component for the `<Filters>` slot, placing it wherever it belongs:
 *
 * @example
 * ```tsx
 * const TypeFilter = createFilterControl(typeFilter, {
 *   renderOptionContent: ({ label, value }) => (
 *     <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
 *       <EuiIcon type={iconByValue.get(value) ?? 'empty'} />
 *       <span>{label}</span>
 *     </EuiFlexGroup>
 *   ),
 * });
 *
 * <Filters>
 *   <Filters.Tags />
 *   <TypeFilter />
 *   <Filters.Sort />
 * </Filters>
 * ```
 *
 * Returns a fresh component each call, so memoize (or define at module scope)
 * for a stable identity — mirrors `useRecentlyAccessedDecoration`.
 */
export const createFilterControl = (
  filterDefinition: ResolvedContentListFilter,
  { renderOptionContent, 'data-test-subj': dataTestSubj }: CreateFilterControlOptions = {}
): ComponentType<Record<never, never>> =>
  filter.createComponent<Record<never, never>>({
    resolve: () => ({
      type: 'custom_component',
      component: (props) => (
        <CustomFilterRenderer
          {...props}
          filterDefinition={filterDefinition}
          renderOptionContent={renderOptionContent}
          data-test-subj={dataTestSubj}
        />
      ),
    }),
  });
