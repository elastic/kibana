/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';

import type { ProcedureSchemas } from './types';

export const getSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypeId: schema.string(),
      id: schema.string({ minLength: 1 }),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  // --> "out" will be (optionally) specified by each storage layer
  out: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};

export interface GetIn<T extends string = string, Options extends object = any> {
  id: string;
  contentTypeId: T;
  options?: Options;
}
