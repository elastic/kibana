/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { allowUnmappedKeysSchema, getDashboardStateSchema } from '../dashboard_state_schemas';
import { baseMetaSchema, createdMetaSchema, updatedMetaSchema } from '../meta_schemas';

export const createRequestParamsSchema = schema.maybe(
  schema.object(
    {
      id: schema.maybe(
        schema.string({
          meta: { description: 'A unique identifier for the dashboard.' },
        })
      ),
    },
    { unknowns: 'forbid' }
  )
);

export const createRequestQuerySchema = schema.maybe(
  schema.object({
    allowUnmappedKeys: schema.maybe(allowUnmappedKeysSchema),
  })
);

export function getCreateRequestBodySchema() {
  return getDashboardStateSchema();
}

export function getCreateResponseBodySchema() {
  return schema.object({
    id: schema.string(),
    data: getDashboardStateSchema(),
    meta: schema.allOf([baseMetaSchema, createdMetaSchema, updatedMetaSchema]),
    spaces: schema.maybe(schema.arrayOf(schema.string())),
  });
}
