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
import type { CreatedByFilterRendererProps } from './created_by_filter_renderer';

const LazyCreatedByFilterRenderer = React.lazy(() =>
  import('./created_by_filter_renderer').then((m) => ({ default: m.CreatedByFilterRenderer }))
);

const CreatedByFilterRendererSuspended = (props: CreatedByFilterRendererProps) => (
  <Suspense
    fallback={
      <EuiFilterButton isLoading isDisabled grow>
        {i18n.translate('contentManagement.contentList.toolbar.createdByFilter.loading', {
          defaultMessage: 'Created by',
        })}
      </EuiFilterButton>
    }
  >
    <LazyCreatedByFilterRenderer {...props} />
  </Suspense>
);
CreatedByFilterRendererSuspended.displayName = 'CreatedByFilterRendererSuspended';

/**
 * `CreatedByFilter` declarative component for toolbar filter composition.
 *
 * Resolves to a `custom_component` filter using the lazy-loaded
 * `CreatedByFilterRenderer` when the user profiles service is available
 * (`hasCreatedBy` is true).
 */
export const CreatedByFilter = filter.createPreset({
  name: 'createdBy',
  resolve: (_attributes, { hasCreatedBy }) => {
    if (!hasCreatedBy) {
      return undefined;
    }
    return { type: 'custom_component', component: CreatedByFilterRendererSuspended };
  },
});
