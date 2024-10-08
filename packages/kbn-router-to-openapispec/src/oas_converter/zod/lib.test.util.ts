/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from '@kbn/zod';

export function createLargeSchema() {
  return z.object({
    string: z.string().max(10).min(1),
    maybeNumber: z.number().max(1000).min(1).optional(),
    booleanDefault: z.boolean({ description: 'defaults to to true' }).default(true),
    ipType: z.string().ip({ version: 'v4' }),
    literalType: z.literal('literallythis'),
    neverType: z.never(),
    map: z.map(z.string(), z.string()),
    record: z.record(z.string(), z.string()),
    union: z.union([
      z.string({ description: 'Union string' }).max(1),
      z.number({ description: 'Union number' }).min(0),
    ]),
    uri: z.string().url().default('prototest://something'),
    any: z.any({ description: 'any type' }),
  });
}
