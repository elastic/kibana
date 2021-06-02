/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

/**
 * @deprecated
 *
 * Legacy logging has been deprecated and will be removed in 8.0.
 * Set up logging from the platform logging instead
 */
export interface LegacyLoggingConfig {
  silent: boolean;
  quiet: boolean;
  verbose: boolean;
  events: Record<string, any>;
  dest: string;
  filter: Record<string, any>;
  json: boolean;
  timezone?: string;
  rotate: {
    enabled: boolean;
    everyBytes: number;
    keepFiles: number;
    pollingInterval: number;
    usePolling: boolean;
    pollingPolicyTestTimeout?: number;
  };
}

export const legacyLoggingConfigSchema = schema.object({
  silent: schema.boolean({ defaultValue: false }),
  quiet: schema.conditional(
    schema.siblingRef('silent'),
    true,
    schema.boolean({
      defaultValue: true,
      validate: (quiet) => {
        if (!quiet) {
          return 'must be true when `silent` is  true';
        }
      },
    }),
    schema.boolean({ defaultValue: false })
  ),
  verbose: schema.conditional(
    schema.siblingRef('quiet'),
    true,
    schema.boolean({
      defaultValue: false,
      validate: (verbose) => {
        if (verbose) {
          return 'must be false when `quiet` is  true';
        }
      },
    }),
    schema.boolean({ defaultValue: false })
  ),
  events: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  dest: schema.string({ defaultValue: 'stdout' }),
  filter: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  json: schema.conditional(
    schema.siblingRef('dest'),
    'stdout',
    schema.boolean({
      defaultValue: !process.stdout.isTTY,
    }),
    schema.boolean({
      defaultValue: true,
    })
  ),
  timezone: schema.maybe(schema.string()),
  rotate: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    everyBytes: schema.number({
      min: 1048576, // > 1MB
      max: 1073741825, // < 1GB
      defaultValue: 10485760, // 10MB
    }),
    keepFiles: schema.number({
      min: 2,
      max: 1024,
      defaultValue: 7,
    }),
    pollingInterval: schema.number({
      min: 5000,
      max: 3600000,
      defaultValue: 10000,
    }),
    usePolling: schema.boolean({ defaultValue: false }),
  }),
});
