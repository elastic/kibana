/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const reducerStreamRequestBodySchema = schema.object({
  /** Boolean flag to enable/disabling simulation of response errors. */
  simulateErrors: schema.maybe(schema.boolean()),
  /** Maximum timeout between streaming messages. */
  timeout: schema.maybe(schema.number()),
  /** Setting to override headers derived compression */
  compressResponse: schema.maybe(schema.boolean()),
});
export type ReducerStreamRequestBodySchema = TypeOf<typeof reducerStreamRequestBodySchema>;
