/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

import { DiscoverServerPlugin } from './plugin';

export const configSchema = schema.object({
  disableFieldsApi: schema.boolean({ defaultValue: false }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    disableFieldsApi: true,
  },
  schema: configSchema,
};

export const plugin = () => new DiscoverServerPlugin();
