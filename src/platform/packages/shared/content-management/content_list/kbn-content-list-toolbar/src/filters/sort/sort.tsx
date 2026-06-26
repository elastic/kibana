/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import { EuiFilterButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { filter } from '../part';
import type { SortRendererProps } from './sort_renderer';

export type { SortFilterProps } from '../part';

const LazySortRenderer = React.lazy(() =>
  import('./sort_renderer').then((m) => ({ default: m.SortRenderer }))
);

const SortRendererSuspended = (props: SortRendererProps) => (
  <Suspense
    fallback={
      <EuiFilterButton isLoading isDisabled grow>
        {i18n.translate('contentManagement.contentList.toolbar.sortFilter.loading', {
          defaultMessage: 'Sort',
        })}
      </EuiFilterButton>
    }
  >
    <LazySortRenderer {...props} />
  </Suspense>
);
SortRendererSuspended.displayName = 'SortRendererSuspended';

/**
 * `SortFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a sort dropdown should appear in the toolbar filters.
 * The `resolve` callback checks whether sorting is available and returns
 * a `SearchFilterConfig` wrapping the lazy-loaded `SortRenderer`, or
 * `undefined` to skip the filter entirely.
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
    if (!hasSorting) {
      return;
    }
    return { type: 'custom_component', component: SortRendererSuspended };
  },
});
