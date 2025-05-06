/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';

const relativeTimeRegex = /^[0-9]+[smhdwMy]$/;
const intervalRegex = /^[0-9]+s$/;

const validateRelativeTime = (value: string) => {
  if (!relativeTimeRegex.test(value)) {
    throw new Error(
      `Invalid value "${value}" for relative time. Must be a number followed by one of the following units: s, m, h, d, w, M, y`
    );
  }
};

const validateInterval = (value: string) => {
  if (!intervalRegex.test(value)) {
    throw new Error(
      `Invalid value "${value}" for interval. Must be a number followed by "s" (seconds)`
    );
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
      defaultValue: '1y',
      validate: validateRelativeTime,
    }),
    // Task manager only supports intervals in seconds or minutes and for some reason the minimum is 30 seconds
    check_interval_in_seconds: schema.string({
      defaultValue: '604800s', // 7 days
      validate: validateInterval,
    }),
    pit_keep_alive: schema.string({
      defaultValue: '10m',
      validate: validateRelativeTime,
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
