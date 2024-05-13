/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dynamic } from '@kbn/shared-ux-utility';

export { usePerformanceContext } from './context/use_performance_context';
export { perfomanceMarkers } from './performance_markers';
export const PerformanceContextProvider = dynamic(() => import('./context/performance_context'));
