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
import type { Logger, PluginConfigDescriptor } from '@kbn/core/server';
import { resolveExternalResumeSigningKey as resolveSigningKey } from '@kbn/workflows/server';

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
  /**
   * Global workflow executions list (`/app/workflows/executions`). Not exposed in Advanced Settings;
   * enable via `workflowsManagement.globalExecutionsView.enabled` in `kibana.yml`.
   */
  globalExecutionsView: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  externalResume: schema.object({
    signingKey: schema.maybe(
      schema.string({
        minLength: 32,
        meta: {
          description:
            'HMAC signing key for external waitForInput resume links. Use bin/kibana-encryption-keys generate in production.',
        },
      })
    ),
  }),
});

export type WorkflowsManagementConfig = TypeOf<typeof configSchema>;

export function resolveExternalResumeSigningKey(
  configuredSigningKey: string | undefined,
  logger: Logger
): string {
  return resolveSigningKey(
    configuredSigningKey,
    logger,
    'workflowsManagement.externalResume.signingKey'
  );
}

export const config: PluginConfigDescriptor<WorkflowsManagementConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    globalExecutionsView: true,
  },
};
