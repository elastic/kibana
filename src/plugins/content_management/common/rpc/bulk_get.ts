/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { Version } from '@kbn/object-versioning';
import { versionSchema } from './constants';
import { GetResult, getResultSchema } from './get';

import type { ProcedureSchemas } from './types';

export const bulkGetSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypeId: schema.string(),
      version: versionSchema,
      ids: schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
      options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.object(
    {
      hits: schema.arrayOf(getResultSchema),
    },
    { unknowns: 'forbid' }
  ),
};

export interface BulkGetIn<T extends string = string, Options extends void | object = object> {
  contentTypeId: T;
  ids: string[];
  version?: Version;
  options?: Options;
}

export interface BulkGetResult<T = unknown, M = void> {
  hits: Array<GetResult<T, M>>;
}
