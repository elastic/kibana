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

const validate = (value: string) => {
  if (!relativeTimeRegex.test(value)) {
    throw new Error(
      `Invalid value "${value}" for relative time. Must be a number followed by one of the following units: s, m, h, d, w, M, y`
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
      validate,
    }),
    check_interval: schema.string({
      defaultValue: '7d',
      validate,
    }),
    pit_keep_alive: schema.string({
      defaultValue: '10m',
      validate,
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
