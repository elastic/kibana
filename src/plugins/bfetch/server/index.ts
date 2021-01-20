/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/server';
import { BfetchServerPlugin } from './plugin';

export { BfetchServerSetup, BfetchServerStart, BatchProcessingRouteParams } from './plugin';
export { StreamingRequestHandler } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new BfetchServerPlugin(initializerContext);
}
