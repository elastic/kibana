/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema, ConfigSchema } from '../config';
import { VisTypeXYServerPlugin } from './plugin';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};

export const plugin = () => new VisTypeXYServerPlugin();
