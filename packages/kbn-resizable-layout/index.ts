/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withSuspense } from '@kbn/shared-ux-utility';
import { lazy } from 'react';

export { ResizableLayoutMode, ResizableLayoutDirection } from './types';
export type { ResizableLayoutProps } from './src/resizable_layout';
export const ResizableLayout = withSuspense(lazy(() => import('./src/resizable_layout')));
