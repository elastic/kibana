/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializer } from '@kbn/core/server';
import type { MaybePromise } from '@kbn/utility-types';
import type { PluginInitializeExampleStartContract } from './plugin';

export { config } from './config';
export type { PluginInitializeExampleDoc } from '../common';
export type {
  PluginInitializeExampleInstanceInfo,
  PluginInitializeExampleStartContract,
} from './plugin';

/** Server entry: `./plugin` is loaded only once core actually runs the plugin. */
export const plugin: PluginInitializer<
  object,
  MaybePromise<PluginInitializeExampleStartContract>
> = async (initContext) => {
  const { PluginInitializeExampleServerPlugin } = await import('./plugin');
  return new PluginInitializeExampleServerPlugin(initContext);
};
