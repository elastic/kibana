/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AuthTypeDef } from '../connector_spec';
import { getAuthType } from './get_auth_type';

export const AUTH_TYPE_DISCRIMINATOR = 'authType';

export const getSchemaForAuthType = (authTypeDef: string | AuthTypeDef) => {
  const { authType, defaults, meta } = getAuthType(authTypeDef);

  const existingMeta = authType.schema.meta() ?? {};
  let schemaToUse = z.object({
    ...authType.schema.shape,
  });

  if (defaults) {
    Object.keys(defaults).forEach((key) => {
      if (schemaToUse.shape[key]) {
        const defaultValue = defaults[key];
        schemaToUse.shape[key] = schemaToUse.shape[key].default(defaultValue);
      }
    });
  }

  if (authType.normalizeSchema) {
    schemaToUse = authType.normalizeSchema(defaults);
  }

  if (meta) {
    Object.keys(meta).forEach((key) => {
      if (schemaToUse.shape[key]) {
        const metaValue = schemaToUse.shape[key].meta();
        const metaOverride = meta[key];
        schemaToUse.shape[key] = schemaToUse.shape[key].meta({ ...metaValue, ...metaOverride });
      }
    });
  }

  // add the authType discriminator key
  return {
    id: authType.id,
    schema: schemaToUse
      .extend({
        [AUTH_TYPE_DISCRIMINATOR]: z.literal(authType.id),
      })
      .meta(existingMeta),
  };
};
