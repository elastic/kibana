/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

export const configSchema = schema.object({
  deeplinks: schema.object({
    navLinkStatus: schema.string({ defaultValue: 'default' }),
  }),
});

export type ManagementConfig = TypeOf<typeof configSchema>;

export type ManagementPublicConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ManagementPublicConfig> = {
  exposeToBrowser: {
    deeplinks: true,
  },
  schema: configSchema,
};
