/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Props } from './file_picker';

export type { Props as FilePickerProps };

const FilePickerContainer = lazy(() => import('./file_picker'));

export const FilePicker = (props: Props) => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <FilePickerContainer {...props} />
  </Suspense>
);
