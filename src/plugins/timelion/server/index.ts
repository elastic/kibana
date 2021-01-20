/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { TimelionPlugin } from './plugin';
import { configSchema, TimelionConfigType } from './config';

export const config: PluginConfigDescriptor<TimelionConfigType> = {
  schema: configSchema.schema,
};

export const plugin = (context: PluginInitializerContext<TimelionConfigType>) =>
  new TimelionPlugin(context);
