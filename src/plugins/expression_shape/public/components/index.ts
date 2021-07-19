/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lazy } from 'react';

export type { ShapeRef, Props as ShapeDrawerProps } from './shape_drawer';
export * from './shape_component';
export const LazyShapeDrawer = lazy(() => import('./shape_drawer'));
