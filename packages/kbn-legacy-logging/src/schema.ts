/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Joi from 'joi';

const HANDLED_IN_KIBANA_PLATFORM = Joi.any().description(
  'This key is handled in the new platform ONLY'
);

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

export const legacyLoggingConfigSchema = Joi.object()
  .keys({
    appenders: HANDLED_IN_KIBANA_PLATFORM,
    loggers: HANDLED_IN_KIBANA_PLATFORM,
    root: HANDLED_IN_KIBANA_PLATFORM,

    silent: Joi.boolean().default(false),

    quiet: Joi.boolean().when('silent', {
      is: true,
      then: Joi.boolean().default(true).valid(true),
      otherwise: Joi.boolean().default(false),
    }),

    verbose: Joi.boolean().when('quiet', {
      is: true,
      then: Joi.valid(false).default(false),
      otherwise: Joi.boolean().default(false),
    }),
    events: Joi.any().default({}),
    dest: Joi.string().default('stdout'),
    filter: Joi.any().default({}),
    json: Joi.boolean().when('dest', {
      is: 'stdout',
      then: Joi.boolean().default(!process.stdout.isTTY),
      otherwise: Joi.boolean().default(true),
    }),
    timezone: Joi.string(),
    rotate: Joi.object()
      .keys({
        enabled: Joi.boolean().default(false),
        everyBytes: Joi.number()
          // > 1MB
          .greater(1048576)
          // < 1GB
          .less(1073741825)
          // 10MB
          .default(10485760),
        keepFiles: Joi.number().greater(2).less(1024).default(7),
        pollingInterval: Joi.number().greater(5000).less(3600000).default(10000),
        usePolling: Joi.boolean().default(false),
      })
      .default(),
  })
  .default();
