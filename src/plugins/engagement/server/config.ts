/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

const chatConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  chatURL: schema.maybe(schema.string()),
  pocJWT: schema.maybe(schema.string()),
  pocID: schema.maybe(schema.string()),
  pocEmail: schema.maybe(schema.string()),
});

const configSchema = schema.object({
  chat: chatConfigSchema,
});

export type EngagementConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<EngagementConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    chat: true,
  },
};
