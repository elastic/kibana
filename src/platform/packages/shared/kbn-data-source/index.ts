/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  Column,
  ColumnSource,
  DataSource,
  DataSourceKind,
  SerializedDataSource,
} from './src/types';

export { IndexPatternSource } from './src/index_pattern_source';
export { EsqlSource } from './src/esql_source';
export type { EsqlSourceArgs } from './src/esql_source';
export { columnFromDataViewField, columnFromDatatableColumn } from './src/to_column';
export { DataSourceService } from './src/data_source_service';
export type { DataViewLookup } from './src/data_source_service';
export {
  registerEsqlSourceInDataViewsCache,
  unregisterFromDataViewsCache,
} from './src/cache_adapter';
