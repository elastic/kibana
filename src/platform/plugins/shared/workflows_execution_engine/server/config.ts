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

const tlsConfigSchema = schema.object({
  certificate: schema.string(),
  key: schema.string(),
  ca: schema.string(),
});

const meteringConfigSchema = schema.object({
  enabled: schema.boolean({
    defaultValue: true,
    meta: {
      description:
        'When enabled, reports workflow execution usage records to the Usage API for billing. ' +
        'Requires a cloud environment (Serverless or ECH) with a valid projectId or deploymentId.',
    },
  }),
  usageApi: schema.object({
    url: schema.maybe(schema.string()),
    tls: schema.maybe(tlsConfigSchema),
  }),
});

export type MeteringConfig = TypeOf<typeof meteringConfigSchema>;

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  logging: schema.object({
    console: schema.boolean({ defaultValue: false }),
  }),
  http: schema.object({
    allowedHosts: schema.arrayOf(
      schema.oneOf([schema.string({ hostname: true }), schema.literal('*')]),
      {
        defaultValue: ['*'],
      }
    ),
  }),
  collectQueueMetrics: schema.boolean({
    defaultValue: false,
    meta: {
      description:
        'When enabled, stores queue delay metrics (scheduledAt, runAt, queueDelayMs, scheduleDelayMs) in workflow executions. ' +
        'Useful for observability but adds to document size. Disabled by default for performance.',
    },
  }),
  metering: meteringConfigSchema,
});

export type WorkflowsExecutionEngineConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<WorkflowsExecutionEngineConfig> = {
  schema: configSchema,
};
