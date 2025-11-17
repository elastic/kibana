/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { NormalizedAuthType } from '../connector_spec';

export const AUTH_TYPE_DISCRIMINATOR = 'authType';
interface AuthTypeOverride {
  defaults: Record<string, unknown> | undefined;
}

export const getSchemaForAuthType = (
  id: string,
  authType: NormalizedAuthType,
  { defaults }: AuthTypeOverride
) => {
  const schemaToUse = z.object({
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

  // add the authType discriminator key
  return schemaToUse.extend({
    [AUTH_TYPE_DISCRIMINATOR]: z.literal(id),
  });
};
