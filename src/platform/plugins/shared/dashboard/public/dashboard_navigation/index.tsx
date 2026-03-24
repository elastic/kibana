/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { Suspense } from 'react';

import type { Props } from './options_editor';

const LazyDashboardNavigationOptionsEditor = React.lazy(async () => {
  const { DashboardNavigationOptionsEditor } = await import(
    '../dashboard_renderer/dashboard_module'
  );
  return { default: DashboardNavigationOptionsEditor };
});

export const DashboardNavigationOptionsEditor = (props: Props) => {
  return (
    <Suspense fallback={<EuiSkeletonText />}>
      <LazyDashboardNavigationOptionsEditor {...props} />
    </Suspense>
  );
};
