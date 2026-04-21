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

export const primitiveRuntimeFieldSchema = schema.object({
  ...commonFieldSchema,
  ...commonRuntimeFieldSchema,
});

export const compositeRuntimeFieldSchema = schema.object({
  type: schema.literal(RUNTIME_FIELD_COMPOSITE_TYPE),
  fields: schema.arrayOf(compositeSubfieldSchema, { maxSize: 100 }),
  ...commonRuntimeFieldSchema,
});

export const runtimeFieldSchema = schema.discriminatedUnion('type', [
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);
