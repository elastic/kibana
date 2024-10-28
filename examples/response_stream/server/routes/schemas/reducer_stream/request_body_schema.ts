/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const reducerStreamRequestBodySchema = schema.object({
  /** Boolean flag to enable/disable simulation of response errors. */
  simulateErrors: schema.maybe(schema.boolean()),
  /** Maximum timeout between streaming messages. */
  timeout: schema.maybe(schema.number()),
  /** Setting to override headers derived compression */
  compressResponse: schema.maybe(schema.boolean()),
  /** Boolean flag to enable/disable 4KB payload flush fix. */
  flushFix: schema.maybe(schema.boolean()),
});
export type ReducerStreamRequestBodySchema = TypeOf<typeof reducerStreamRequestBodySchema>;
