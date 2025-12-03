/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isString } from 'lodash';
import { authTypeSpecs } from '../..';
import type { AuthTypeDef, NormalizedAuthType } from '../connector_spec';

export const AUTH_TYPE_DISCRIMINATOR = 'authType';

const getAuthType = (id: string): NormalizedAuthType => {
  for (const s of Object.values(authTypeSpecs)) {
    if (s.id === id) {
      return s as NormalizedAuthType;
    }
  }

  throw new Error(`Auth type with id ${id} not found.`);
};

export const getSchemaForAuthType = (authTypeDef: string | AuthTypeDef) => {
  let authTypeId: string | undefined;
  let defaults: Record<string, unknown> | undefined;

  if (isString(authTypeDef)) {
    authTypeId = authTypeDef as string;
  } else {
    const def = authTypeDef as AuthTypeDef;
    authTypeId = def.type;
    defaults = def.defaults;
  }

  if (!authTypeId) {
    throw new Error('Auth type ID must be provided.');
  }

  const authType = getAuthType(authTypeId);

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

  // add the authType discriminator key
  return schemaToUse.extend({
    [AUTH_TYPE_DISCRIMINATOR]: z.literal(authTypeId),
  });
};
