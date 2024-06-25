/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

export function createLargeSchema() {
  return schema.object({
    string: schema.string({ maxLength: 10, minLength: 1 }),
    maybeNumber: schema.maybe(schema.number({ max: 1000, min: 1 })),
    booleanDefault: schema.boolean({
      defaultValue: true,
      meta: {
        description: 'defaults to to true',
      },
    }),
    ipType: schema.ip({ versions: ['ipv4'] }),
    literalType: schema.literal('literallythis'),
    neverType: schema.never(),
    map: schema.mapOf(schema.string(), schema.string()),
    record: schema.recordOf(schema.string(), schema.string()),
    union: schema.oneOf([
      schema.string({ maxLength: 1, meta: { description: 'Union string' } }),
      schema.number({ min: 0, meta: { description: 'Union number' } }),
    ]),
    uri: schema.uri({
      scheme: ['prototest'],
      defaultValue: () => 'prototest://something',
    }),
    any: schema.any({ meta: { description: 'any type' } }),
  });
}
