/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const REGISTRY_EXTENSIONS_ROUTE = '/internal/esql_registry/extensions/';
export const SOURCES_AUTOCOMPLETE_ROUTE = '/internal/esql/autocomplete/sources/';

export enum SOURCES_TYPES {
  INDEX = 'Index',
  TIMESERIES = 'Timeseries',
  INTEGRATION = 'Integration',
  ALIAS = 'Alias',
  DATA_STREAM = 'Data Stream',
  LOOKUP = 'Lookup',
}
