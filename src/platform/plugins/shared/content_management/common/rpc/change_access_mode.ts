/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectAccessControl } from '@kbn/core/server';
import type { Version } from '@kbn/object-versioning';
import type { ProcedureSchemas } from './types';
import { versionSchema } from './constants';

export const changeAccessModeSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      version: schema.maybe(versionSchema),
      objects: schema.arrayOf(
        schema.object(
          {
            contentTypeId: schema.string(),
            id: schema.string(),
          },
          { unknowns: 'forbid' }
        ),
        { minSize: 1 }
      ),
      options: schema.object(
        {
          accessMode: schema.oneOf([schema.literal('read_only'), schema.literal('default')]),
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
  version?: Version;
  objects: Array<{
    contentTypeId: string;
    id: string;
  }>;
  options: {
    accessMode: SavedObjectAccessControl['accessMode'];
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
