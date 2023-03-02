/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { SideNavigationProps } from './side_navigation';

export { SideNavigationProps as SideNavigationProps };

const SideNavigationLazy = lazy(() => import('./side_navigation'));

export const SideNavigation = (props: SideNavigationProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <SideNavigationLazy {...props} />
  </Suspense>
);
