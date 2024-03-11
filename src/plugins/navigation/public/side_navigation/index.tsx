/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, type FC } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { SideNavComponent as SideNavComponentType } from '@kbn/core-chrome-browser';

import type { Props as NavigationProps } from './side_navigation';

const SideNavComponentLazy = React.lazy(() => import('./side_navigation'));

const SideNavComponent: FC<NavigationProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="s" />}>
    <SideNavComponentLazy {...props} />
  </Suspense>
);

export const getSideNavComponent = (props: NavigationProps): SideNavComponentType => {
  return () => <SideNavComponent {...props} />;
};
