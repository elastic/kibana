/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { UI_SETTINGS } from '@kbn/data-service/src/constants';

export const DEFAULT_QUERY_LANGUAGE = 'kuery';
export const KIBANA_USER_QUERY_LANGUAGE_KEY = 'kibana.userQueryLanguage';

export type ValueSuggestionsMethod = 'terms_enum' | 'terms_agg';

export const SAVED_QUERY_BASE_URL = '/internal/saved_query';

export const KQL_TELEMETRY_ROUTE_LATEST_VERSION = '1';
export const SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION = '1';
