/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  MAX_NAME_LENGTH,
  primitiveTypeSchema,
  RUNTIME_FIELD_COMPOSITE_TYPE,
  scriptSchema,
} from './common';
import { fieldSettingsBaseSchema } from '../schema_field_settings';

export const runtimeFieldBaseSchema = fieldSettingsBaseSchema.extend({
  type: primitiveTypeSchema,
});

export const primitiveRuntimeFieldSchema = runtimeFieldBaseSchema
  .extend({
    script: scriptSchema,
  })
  .meta({ id: 'kbn-runtime-field-schema', title: 'Runtime field' });

export const compositeRuntimeFieldSchema = z
  .object({
    type: z.literal(RUNTIME_FIELD_COMPOSITE_TYPE),
    fields: z.record(z.string().min(1).max(MAX_NAME_LENGTH), runtimeFieldBaseSchema),
    script: scriptSchema,
  })
  .meta({ id: 'kbn-composite-runtime-field-schema', title: 'Composite runtime field' });

export const runtimeFieldSchema = z.discriminatedUnion('type', [
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);
