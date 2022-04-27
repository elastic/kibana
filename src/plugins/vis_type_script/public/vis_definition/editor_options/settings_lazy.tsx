/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { IExternalUrl } from '@kbn/core/public';

// @ts-ignore
const SettingsOptionsComponent = lazy(() => import('./settings'));

export const getSettingsOptions = (validateUrl: IExternalUrl['validateUrl']) => (props: any) =>
  (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <SettingsOptionsComponent {...props} validateUrl={validateUrl} />
    </Suspense>
  );
