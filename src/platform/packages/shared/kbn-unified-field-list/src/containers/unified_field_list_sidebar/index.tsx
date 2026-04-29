/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { EuiDelayRender, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import type {
  UnifiedFieldListSidebarContainerProps,
  UnifiedFieldListSidebarContainerApi,
} from './field_list_sidebar_container';

const LazyUnifiedFieldListSidebarContainer = React.lazy(
  () => import('./field_list_sidebar_container')
);

export const UnifiedFieldListSidebarContainer = withSuspense<
  UnifiedFieldListSidebarContainerProps,
  UnifiedFieldListSidebarContainerApi
>(
  LazyUnifiedFieldListSidebarContainer,
  <EuiDelayRender delay={300}>
    <EuiPanel color="transparent" paddingSize="s">
      <EuiLoadingSpinner size="m" />
    </EuiPanel>
  </EuiDelayRender>
);

export type { UnifiedFieldListSidebarContainerProps, UnifiedFieldListSidebarContainerApi };
