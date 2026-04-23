/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { TypeOf } from '@kbn/config-schema';
import type {
  dataViewReferenceSchema,
  dataViewSchema,
  dataViewSpecSchema,
  fieldSettingsSchema,
} from './schema_data_view';
import type { esqlDataSourceSchema } from './schema_esql_data_source';
import type {
  compositeRuntimeFieldSchema,
  runtimeFieldBaseSchema,
  runtimeFieldSchema,
} from './schema_runtime_field';

export type AsCodeFieldSettings = TypeOf<typeof fieldSettingsSchema>;
export type AsCodeCompositeRuntimeField = TypeOf<typeof compositeRuntimeFieldSchema>;
export type AsCodeRuntimeBaseField = TypeOf<typeof runtimeFieldBaseSchema>;
export type AsCodeRuntimeField = TypeOf<typeof runtimeFieldSchema>;
export type AsCodeDataViewReference = TypeOf<typeof dataViewReferenceSchema>;
export type AsCodeDataViewSpec = TypeOf<typeof dataViewSpecSchema>;
export type AsCodeDataView = TypeOf<typeof dataViewSchema>;
export type AsCodeEsqlDataSource = TypeOf<typeof esqlDataSourceSchema>;
