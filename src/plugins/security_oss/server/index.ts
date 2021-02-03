/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';

import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { ConfigSchema } from './config';
import { SecurityOssPlugin } from './plugin';

export { SecurityOssPluginSetup } from './plugin';

export const config: PluginConfigDescriptor<TypeOf<typeof ConfigSchema>> = {
  schema: ConfigSchema,
  exposeToBrowser: {
    showInsecureClusterWarning: true,
  },
};

export const plugin = (context: PluginInitializerContext) => new SecurityOssPlugin(context);
