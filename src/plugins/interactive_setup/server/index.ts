/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';

import { ConfigSchema } from './config';
import { InteractiveSetupPlugin } from './plugin';

export const config: PluginConfigDescriptor<TypeOf<typeof ConfigSchema>> = {
  schema: ConfigSchema,
};

export const plugin: PluginInitializer<void, never> = (
  initializerContext: PluginInitializerContext
) => new InteractiveSetupPlugin(initializerContext);
