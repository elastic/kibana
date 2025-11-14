/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { NormalizedAuthType } from '../connector_spec';

export const AUTH_TYPE_DISCRIMINATOR = 'authType';
interface AuthTypeOverride {
  customSchema?: z.ZodSchema;
  mergeStrategy: 'merge' | 'override';
}
export const getSchemaForAuthType = (
  id: string,
  authType: NormalizedAuthType,
  { customSchema, mergeStrategy }: AuthTypeOverride
) => {
  let schemaToUse = authType.schema;
  if (customSchema && customSchema instanceof z.ZodObject) {
    if (mergeStrategy === 'override') {
      // use the custom schema
      schemaToUse = customSchema;
    } else {
      // merge the schemas, with the custom schema overriding any shared props
      schemaToUse = schemaToUse.merge(customSchema);
    }
  }

  // add the authType discriminator key
  return schemaToUse.extend({
    [AUTH_TYPE_DISCRIMINATOR]: z.literal(id),
  });
};
