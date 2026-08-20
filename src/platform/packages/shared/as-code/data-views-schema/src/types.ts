/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
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

export type AsCodeFieldSettings = z.output<typeof fieldSettingsSchema>;
export type AsCodeCompositeRuntimeField = z.output<typeof compositeRuntimeFieldSchema>;
export type AsCodeRuntimeBaseField = z.output<typeof runtimeFieldBaseSchema>;
export type AsCodeRuntimeField = z.output<typeof runtimeFieldSchema>;
export type AsCodeDataViewReference = z.output<typeof dataViewReferenceSchema>;
export type AsCodeDataViewSpec = z.output<typeof dataViewSpecSchema>;
export type AsCodeDataView = z.output<typeof dataViewSchema>;
export type AsCodeEsqlDataSource = z.output<typeof esqlDataSourceSchema>;

// Saved schemas
export type AsCodeSavedFieldSettings = z.output<typeof savedFieldSettingsSchema>;
export type AsCodeSavedCompositeRuntimeField = z.output<typeof savedCompositeRuntimeFieldSchema>;
export type AsCodeSavedPrimitiveRuntimeField = z.output<typeof savedPrimitiveRuntimeFieldSchema>;
export type AsCodeSavedRuntimeField = z.output<typeof savedRuntimeFieldSchema>;
export type AsCodeSavedDataView = z.output<typeof savedDataViewSpecSchema>;
