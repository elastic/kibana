/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { baseMetaSchema, createdMetaSchema, updatedMetaSchema } from '../meta_schemas';

const DASHBOARD_ID_REGEX = /^[a-z0-9_\-]+$/;

export function getCreateRequestBodySchema() {
  return schema.object({
    id: schema.maybe(
      schema.string({
        maxLength: 100,
        minLength: 1,
        validate: (value) => {
          if (!DASHBOARD_ID_REGEX.test(value)) {
            return `must be lower case, a-z, 0-9, '_', and '-' are allowed`;
          }
        },
        meta: {
          description: `The ID of the dashboard. Must be lower case, a-z, 0-9, '_', and '-' are allowed.`,
        },
      })
    ),
    data: getDashboardStateSchema(),
    spaces: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 1 })),
  });
}

export function getCreateResponseBodySchema() {
  return schema.object({
    id: schema.string(),
    data: getDashboardStateSchema(),
    meta: schema.allOf([baseMetaSchema, createdMetaSchema, updatedMetaSchema]),
    spaces: schema.maybe(schema.arrayOf(schema.string())),
  });
}
