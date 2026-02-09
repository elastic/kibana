/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';

export function createLargeSchema() {
  return z.object({
    string: z.string().max(10).min(1),
    maybeNumber: z.number().max(1000).min(1).optional(),
    booleanDefault: z.boolean().default(true).describe('defaults to to true'),
    booleanFromString: BooleanFromString.default(false).describe(
      'boolean or string "true" or "false"'
    ),
    ipType: z.ipv4(),
    literalType: z.literal('literallythis'),
    neverType: z.never(),
    map: z.map(z.string(), z.string()),
    record: z.record(z.string(), z.string()),
    union: z.union([
      z.string().max(1).describe('Union string'),
      z.number().min(0).describe('Union number'),
    ]),
    uri: z.url().default('prototest://something'),
    any: z.any().describe('any type'),
  });
}
