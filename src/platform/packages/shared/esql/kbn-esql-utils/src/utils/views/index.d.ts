/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  createEsqlViewsManagementClient,
  ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE,
  EsqlViewsClientError,
  type EsqlViewsClient,
} from './esql_views_client';
export {
  MAX_ESQL_VIEW_DESCRIPTION_LENGTH,
  MAX_ESQL_VIEW_NAME_LENGTH,
  MAX_ESQL_VIEW_QUERY_LENGTH,
  validateEsqlViewName,
  type EsqlViewNameValidationError,
} from './esql_view_validation';
export { getViewEsqlQuery } from './get_view_esql_query';
export { resolveViewColumnToIndexField } from './resolve_view_column_to_index_field';
