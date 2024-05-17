/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';

// @ts-ignore
const SettingsOptionsComponent = lazy(() => import('./settings_options'));

export const SettingsOptions = (props: any) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <SettingsOptionsComponent {...props} />
  </Suspense>
);
