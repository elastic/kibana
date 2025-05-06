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
  DEFAULT_URL_EXPIRATION_CHECK_INTERVAL_IN_SECONDS,
  DEFAULT_URL_EXPIRATION_DURATION,
  DEFAULT_URL_EXPIRATION_PIT_KEEP_ALIVE,
} from './unused_urls_task';

const timeStringRegex = /^[0-9]+[smhdwMy]$/;
const timeStringSecondsOnlyRegex = /^[0-9]+s$/;

const validateTimeString = (value: string) => {
  if (!timeStringRegex.test(value)) {
    return `Invalid value: "${value}". Must be a positive integer followed by one of the following units: s, m, h, d, w, M, y`;
  }
};

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
    duration: schema.string({
      defaultValue: DEFAULT_URL_EXPIRATION_DURATION,
      validate: validateTimeString,
    }),
    // Task manager only supports intervals in seconds or minutes and the minimum is 30 seconds
    check_interval_in_seconds: schema.string({
      defaultValue: DEFAULT_URL_EXPIRATION_CHECK_INTERVAL_IN_SECONDS,
      validate: (value: string) => {
        if (!timeStringSecondsOnlyRegex.test(value)) {
          return `Invalid value: "${value}". Must be a number positive integer followed by "s" (seconds)`;
        }
      },
    }),
    pit_keep_alive: schema.string({
      defaultValue: DEFAULT_URL_EXPIRATION_PIT_KEEP_ALIVE,
      validate: validateTimeString,
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
