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
import type { StarredFilterRendererProps } from './starred_filter_renderer';

export type { StarredFilterProps } from '../part';

const LazyStarredFilterRenderer = React.lazy(() =>
  import('./starred_filter_renderer').then((m) => ({ default: m.StarredFilterRenderer }))
);

const StarredFilterRendererSuspended = (props: StarredFilterRendererProps) => (
  <Suspense
    fallback={
      <EuiFilterButton isLoading isDisabled grow>
        {i18n.translate('contentManagement.contentList.toolbar.starredFilter.loading', {
          defaultMessage: 'Starred',
        })}
      </EuiFilterButton>
    }
  >
    <LazyStarredFilterRenderer {...props} />
  </Suspense>
);
StarredFilterRendererSuspended.displayName = 'StarredFilterRendererSuspended';

/**
 * `StarredFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a starred toggle should appear in the toolbar filters.
 * The `resolve` callback checks whether starred is available and returns
 * a `SearchFilterConfig` wrapping the lazy-loaded `StarredFilterRenderer`, or
 * `undefined` to skip the filter entirely.
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
      return;
    }
    return { type: 'custom_component', component: StarredFilterRendererSuspended };
  },
});
