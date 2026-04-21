/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  commonFieldSchema,
  commonRuntimeFieldSchema,
  compositeSubfieldSchema,
  RUNTIME_FIELD_COMPOSITE_TYPE,
} from '../common/runtime_fields';

const commonStoredRuntimeFieldSchema = {
  popularity: schema.maybe(schema.number({ min: 0 })),
};

const primitiveStoredRuntimeFieldSchema = schema.object({
  ...commonStoredRuntimeFieldSchema,
  ...commonFieldSchema,
  ...commonRuntimeFieldSchema,
});

const compositeStoredRuntimeFieldSchema = schema.object({
  ...commonStoredRuntimeFieldSchema,
  type: schema.literal(RUNTIME_FIELD_COMPOSITE_TYPE),
  fields: schema.arrayOf(compositeSubfieldSchema.extends(commonStoredRuntimeFieldSchema), {
    maxSize: 100,
  }),
  ...commonRuntimeFieldSchema,
});

export const storedRuntimeFieldSchema = schema.discriminatedUnion('type', [
  primitiveStoredRuntimeFieldSchema,
  compositeStoredRuntimeFieldSchema,
]);
