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
  DEFAULT_MAX_PAGE_SIZE,
  DEFAULT_URL_EXPIRATION_CHECK_INTERVAL,
  DEFAULT_URL_EXPIRATION_DURATION,
  DEFAULT_URL_EXPIRATION_PIT_KEEP_ALIVE,
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
    pit_keep_alive: schema.duration({
      defaultValue: DEFAULT_URL_EXPIRATION_PIT_KEEP_ALIVE,
    }),
    max_page_size: schema.number({
      defaultValue: DEFAULT_MAX_PAGE_SIZE,
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
