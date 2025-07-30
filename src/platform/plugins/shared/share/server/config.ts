/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  DEFAULT_URL_LIMIT,
  DEFAULT_URL_EXPIRATION_CHECK_INTERVAL,
  DEFAULT_URL_EXPIRATION_DURATION,
} from './unused_urls_task';

export const configSchema = schema.object({
  new_version: schema.object({
    enabled: schema.boolean({
      defaultValue: false,
    }),
  }),
  url_expiration: schema.object({
    enabled: schema.boolean({
      defaultValue: false,
    }),
    duration: schema.duration({
      defaultValue: DEFAULT_URL_EXPIRATION_DURATION,
    }),
    check_interval: schema.duration({
      defaultValue: DEFAULT_URL_EXPIRATION_CHECK_INTERVAL,
    }),
    url_limit: schema.number({
      defaultValue: DEFAULT_URL_LIMIT,
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
