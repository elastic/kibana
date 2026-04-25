/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  logging: schema.object({
    console: schema.boolean({ defaultValue: false }),
  }),
  /**
   * Whether the plugin is available in the current offering pricing model.
   * This is used to turn off workflows management server features via config in specific serverless tiers,
   * without completely disabling the plugin.
   */
  available: schema.boolean({ defaultValue: true }),
});

export type WorkflowsManagementConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<WorkflowsManagementConfig> = {
  schema: configSchema,
};
