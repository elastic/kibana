/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SERVICE_KEY, SERVICE_KEY_LEGACY } from '../../constants';
import { dataViewSpecSchema } from '../shared_schema';

import { serializedFieldFormatSchema } from '../../../common/schemas';
import { DataViewSpecRestResponse, FieldSpec } from '../../../common/types';

const dataViewsRuntimeResponseSchema = schema.object({
  [SERVICE_KEY]: dataViewSpecSchema,
  fields: schema.arrayOf(serializedFieldFormatSchema),
});

const indexPatternsRuntimeResponseSchema = schema.object({
  [SERVICE_KEY_LEGACY]: dataViewSpecSchema,
  field: serializedFieldFormatSchema,
});

export const runtimeResponseSchema = schema.oneOf([
  dataViewsRuntimeResponseSchema,
  indexPatternsRuntimeResponseSchema,
]);

export interface DataViewsRuntimeResponseType {
  data_view: DataViewSpecRestResponse;
  fields: FieldSpec[];
}

export interface IndexPatternsRuntimeResponseType {
  index_pattern: DataViewSpecRestResponse;
  field: FieldSpec;
}

export interface RuntimeResponseType {
  body: DataViewsRuntimeResponseType | IndexPatternsRuntimeResponseType;
}
