/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  disableApis: schema.boolean({ defaultValue: false }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
};
