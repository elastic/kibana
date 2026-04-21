/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { TypeOf } from '@kbn/config-schema';
import type { runtimeFieldSchema } from './adhoc/runtime_fields';
import type {
  dataViewReferenceSchema,
  dataViewSchema,
  dataViewSpecSchema,
} from './adhoc/data_views';
import type { storedDataViewSchema } from './stored/data_views';
import type { storedRuntimeFieldSchema } from './stored/runtime_fields';
import type { esqlDataSourceSchema } from './schema_esql_data_source';

export type AsCodeRuntimeField = TypeOf<typeof runtimeFieldSchema>;
export type AsCodeDataViewReference = TypeOf<typeof dataViewReferenceSchema>;
export type AsCodeDataViewSpec = TypeOf<typeof dataViewSpecSchema>;
export type AsCodeDataView = TypeOf<typeof dataViewSchema>;
export type AsCodeEsqlDataSource = TypeOf<typeof esqlDataSourceSchema>;

export type AsCodeStoredDataView = TypeOf<typeof storedDataViewSchema>;
export type AsCodeStoredRuntimeField = TypeOf<typeof storedRuntimeFieldSchema>;
