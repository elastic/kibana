/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  apiKey: schema.maybe(schema.string()),
});

export type OpenAiConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<OpenAiConfig> = {
  schema: configSchema,
};
