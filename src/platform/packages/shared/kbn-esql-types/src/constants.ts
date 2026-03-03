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
export const TIMEFIELD_ROUTE = '/internal/esql/get_timefield/';
export const VIEWS_ROUTE = '/internal/esql/views';

const LOOKUP_INDEX_ROUTE = '/internal/esql/lookup_index';
export const LOOKUP_INDEX_CREATE_ROUTE = `${LOOKUP_INDEX_ROUTE}/create`;
export const LOOKUP_INDEX_UPDATE_ROUTE = `${LOOKUP_INDEX_ROUTE}/update`;
export const LOOKUP_INDEX_RECREATE_ROUTE = `${LOOKUP_INDEX_ROUTE}/recreate`;
export const LOOKUP_INDEX_PRIVILEGES_ROUTE = `${LOOKUP_INDEX_ROUTE}/privileges`;
export const LOOKUP_INDEX_UPDATE_MAPPINGS_ROUTE = `${LOOKUP_INDEX_ROUTE}/update_mappings`;

export enum SOURCES_TYPES {
  INDEX = 'Index',
  TIMESERIES = 'Timeseries',
  INTEGRATION = 'Integration',
  ALIAS = 'Alias',
  DATA_STREAM = 'Data Stream',
  LOOKUP = 'Lookup',
}
