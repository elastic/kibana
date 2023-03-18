/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { SolutionSideNavProps } from './solution_side_nav';

export type { SolutionSideNavProps };

const SolutionSideNavLazy = lazy(() => import('./solution_side_nav'));

export const SolutionSideNav = (props: SolutionSideNavProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <SolutionSideNavLazy {...props} />
  </Suspense>
);
