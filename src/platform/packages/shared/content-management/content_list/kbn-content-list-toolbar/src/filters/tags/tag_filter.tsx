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
import type { TagFilterRendererProps } from './tag_filter_renderer';

export type { TagFilterProps } from '../part';

const LazyTagFilterRenderer = React.lazy(() =>
  import('./tag_filter_renderer').then((m) => ({ default: m.TagFilterRenderer }))
);

const TagFilterRendererSuspended = (props: TagFilterRendererProps) => (
  <Suspense
    fallback={
      <EuiFilterButton isLoading isDisabled grow>
        {i18n.translate('contentManagement.contentList.toolbar.tagFilter.loading', {
          defaultMessage: 'Tags',
        })}
      </EuiFilterButton>
    }
  >
    <LazyTagFilterRenderer {...props} />
  </Suspense>
);
TagFilterRendererSuspended.displayName = 'TagFilterRendererSuspended';

/**
 * `TagFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a tag filter dropdown should appear in the toolbar filters.
 * The `resolve` callback checks whether tags are available and returns
 * a `SearchFilterConfig` wrapping the lazy-loaded `TagFilterRenderer`, or
 * `undefined` to skip the filter entirely.
 *
 * Tags must be enabled via the provider's `services.tags` configuration.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Tags />
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export const TagFilter = filter.createPreset({
  name: 'tags',
  resolve: (_attributes, { hasTags }) => {
    if (!hasTags) {
      return;
    }
    return { type: 'custom_component', component: TagFilterRendererSuspended };
  },
});
