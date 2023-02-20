/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';

import type { ProcedureSchemas } from './types';

export const updateSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypeId: schema.string(),
      id: schema.string({ minLength: 1 }),
      // --> "data" to update a content will be defined by each content type
      data: schema.recordOf(schema.string(), schema.any()),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};

export interface UpdateIn<
  T extends string = string,
  Data extends object = object,
  Options extends object = object
> {
  contentTypeId: T;
  id: string;
  data: Data;
  options?: Options;
}
