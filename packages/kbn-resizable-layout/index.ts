/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { withSuspense } from '@kbn/shared-ux-utility';
import { lazy } from 'react';
import type { PanelsProps } from './panels';

export { ResizableLayoutMode, ResizableLayoutDirection } from './types';
export type ResizableLayoutProps = PanelsProps;
export const ResizableLayout = withSuspense<ResizableLayoutProps>(lazy(() => import('./panels')));
