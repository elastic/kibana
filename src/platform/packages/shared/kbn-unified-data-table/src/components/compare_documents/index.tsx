/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridRefProps } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import { lazy } from 'react';
import type { CompareDocumentsProps } from './compare_documents';

export const CompareDocuments = withSuspense<CompareDocumentsProps, EuiDataGridRefProps>(
  lazy(() => import('./compare_documents'))
);
