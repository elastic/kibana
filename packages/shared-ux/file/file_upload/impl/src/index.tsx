/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense, ReactNode } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Props } from './file_upload';

export type { DoneNotification } from './upload_state';

export type FileUploadProps = Props & {
  /**
   * A custom fallback for when component is lazy loading,
   * If not provided, <EuiLoadingSpinner /> is used
   */
  lazyLoadFallback?: ReactNode;
};

const FileUploadContainer = lazy(() => import('./file_upload'));

export const FileUpload = (props: FileUploadProps) => (
  <Suspense fallback={props.lazyLoadFallback ?? <EuiLoadingSpinner size="xl" />}>
    <FileUploadContainer {...props} />
  </Suspense>
);
