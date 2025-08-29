/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ProcedureSchemas } from './types';

export const changeAccessModeSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      objects: schema.arrayOf(
        schema.object(
          {
            type: schema.string(),
            id: schema.string(),
          },
          { unknowns: 'forbid' }
        ),
        { minSize: 1 }
      ),
      options: schema.object(
        {
          accessMode: schema.maybe(
            schema.oneOf([schema.literal('read_only'), schema.literal('default')])
          ),
        },
        { unknowns: 'forbid' }
      ),
    },
    { unknowns: 'forbid' }
  ),
  out: schema.maybe(
    schema.object({
      objects: schema.arrayOf(
        schema.object({
          id: schema.string(),
          type: schema.string(),
          error: schema.maybe(
            schema.object({
              error: schema.string(),
              message: schema.string(),
              statusCode: schema.number(),
              metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
            })
          ),
        })
      ),
    })
  ),
};

export interface ChangeAccessModeIn {
  objects: Array<{
    type: string;
    id: string;
  }>;
  options: {
    accessMode?: 'read_only' | 'default';
  };
}

export interface ChangeAccessModeResult {
  objects: Array<
    {
      type: string;
      id: string;
    } & { error?: { error: string; message: string; statusCode: number } }
  >;
}
