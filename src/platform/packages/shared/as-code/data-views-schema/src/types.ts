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
} from './data_views/schema_embedded_data_view';
import type { esqlDataSourceSchema } from './schema_esql_data_source';
import type {
  compositeRuntimeFieldSchema,
  runtimeFieldBaseSchema,
  runtimeFieldSchema,
} from './runtime_fields/schema_embedded_runtime_field';
import type {
  savedDataViewSpecSchema,
  savedFieldSettingsSchema,
} from './data_views/schema_saved_data_view';
import type {
  savedCompositeRuntimeFieldSchema,
  savedPrimitiveRuntimeFieldSchema,
  savedRuntimeFieldSchema,
} from './runtime_fields/schema_saved_runtime_fields';

export type AsCodeFieldSettings = TypeOf<typeof fieldSettingsSchema>;
export type AsCodeCompositeRuntimeField = TypeOf<typeof compositeRuntimeFieldSchema>;
export type AsCodeRuntimeBaseField = TypeOf<typeof runtimeFieldBaseSchema>;
export type AsCodeRuntimeField = TypeOf<typeof runtimeFieldSchema>;
export type AsCodeDataViewReference = TypeOf<typeof dataViewReferenceSchema>;
export type AsCodeDataViewSpec = TypeOf<typeof dataViewSpecSchema>;
export type AsCodeDataView = TypeOf<typeof dataViewSchema>;
export type AsCodeEsqlDataSource = TypeOf<typeof esqlDataSourceSchema>;

// Saved schemas
export type AsCodeSavedFieldSettings = TypeOf<typeof savedFieldSettingsSchema>;
export type AsCodeSavedCompositeRuntimeField = TypeOf<typeof savedCompositeRuntimeFieldSchema>;
export type AsCodeSavedPrimitiveRuntimeField = TypeOf<typeof savedPrimitiveRuntimeFieldSchema>;
export type AsCodeSavedRuntimeField = TypeOf<typeof savedRuntimeFieldSchema>;
export type AsCodeSavedDataView = TypeOf<typeof savedDataViewSpecSchema>;
