/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Props } from './upload_file';

export type { DoneNotification } from './upload_state';
export type { Props as UploadFileProps };

const UploadFileContainer = lazy(() => import('./upload_file'));

export const UploadFile = (props: Props) => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <UploadFileContainer {...props} />
  </Suspense>
);
