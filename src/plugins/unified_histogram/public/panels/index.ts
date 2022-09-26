/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lazy } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export type { PanelsProps } from './panels';
export { PANELS_MODE } from './panels';

const LazyPanels = lazy(() => import('./panels'));

export const Panels = withSuspense(LazyPanels);
