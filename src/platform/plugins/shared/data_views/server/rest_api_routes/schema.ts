/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { SERVICE_KEY, SERVICE_KEY_LEGACY } from '../constants';

import { fieldSpecSchemaFields } from '../../common/schema/schemas';

import { dataViewSpecSchema } from '../../common/schema/data_view_spec_schema';

export const dataViewsRuntimeResponseSchema = () =>
  schema.object({
    [SERVICE_KEY]: dataViewSpecSchema,
    fields: schema.arrayOf(schema.object(fieldSpecSchemaFields)),
  });

export const indexPatternsRuntimeResponseSchema = () =>
  schema.object({
    [SERVICE_KEY_LEGACY]: dataViewSpecSchema,
    field: schema.object(fieldSpecSchemaFields),
  });

export const runtimeResponseSchema = () =>
  schema.oneOf([dataViewsRuntimeResponseSchema(), indexPatternsRuntimeResponseSchema()]);
