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
export const JOIN_INDICES_AUTOCOMPLETE_ROUTE = '/internal/esql/autocomplete/join/indices';
export const TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE =
  '/internal/esql/autocomplete/timeseries/indices';
export const TIMEFIELD_ROUTE = '/internal/esql/get_timefield';
export const SOURCE_INFO_ROUTE = '/internal/esql/source_info';
export const VIEWS_ROUTE = '/internal/esql/views';
export const VIEWS_BULK_DELETE_ROUTE = `${VIEWS_ROUTE}/_bulk_delete`;
export const DATASETS_ROUTE = '/internal/esql/datasets';

/** Id of the Elasticsearch feature (and UI capabilities key) registered by the ES|QL Views plugin. */
export const ESQL_VIEWS_FEATURE_ID = 'esqlViews';
/** UI capabilities exposed under {@link ESQL_VIEWS_FEATURE_ID}, each backed by ES|QL view index privileges. */
export const ESQL_VIEWS_CAPABILITIES = {
  read: 'read',
  create: 'create',
  edit: 'edit',
  delete: 'delete',
} as const;
export const NL_TO_ESQL_ROUTE = '/internal/esql/nl_to_esql';
export const SUGGEST_FIX_ROUTE = '/internal/esql/suggest_fix';
export const FIX_WITH_AI_COMMAND_ID = 'esql.fixWithAI';

const INDEX_EDITOR_ROUTE = '/internal/esql/index_editor';
export const INDEX_EDITOR_CREATE_ROUTE = `${INDEX_EDITOR_ROUTE}/create`;
export const INDEX_EDITOR_UPDATE_ROUTE = `${INDEX_EDITOR_ROUTE}/update`;
export const INDEX_EDITOR_RECREATE_ROUTE = `${INDEX_EDITOR_ROUTE}/recreate`;
export const INDEX_EDITOR_PRIVILEGES_ROUTE = `${INDEX_EDITOR_ROUTE}/privileges`;
export const INDEX_EDITOR_UPDATE_MAPPINGS_ROUTE = `${INDEX_EDITOR_ROUTE}/update_mappings`;
export const INDEX_EDITOR_RESOLVE_ROUTE = `${INDEX_EDITOR_ROUTE}/resolve`;

export enum SOURCES_TYPES {
  INDEX = 'Index',
  TIMESERIES = 'Timeseries',
  INTEGRATION = 'Integration',
  ALIAS = 'Alias',
  DATA_STREAM = 'Data Stream',
  LOOKUP = 'Lookup',
  WIRED_STREAM = 'Wired Stream',
  CLASSIC_STREAM = 'Classic Stream',
  QUERY_STREAM = 'Query Stream',
  EXTERNAL = 'External data',
  VIEW = 'View',
}
