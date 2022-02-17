/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/public';
import { BfetchPublicPlugin } from './plugin';

export type { BfetchPublicSetup, BfetchPublicStart, BfetchPublicContract } from './plugin';
export { split } from './streaming';

export type { BatchedFunc } from './batching/types';

export { DISABLE_BFETCH } from '../common/constants';

export function plugin(initializerContext: PluginInitializerContext) {
  return new BfetchPublicPlugin(initializerContext);
}
