/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as settings from '@kbn/management-settings-ids';

export const OBSERVABILITY_PROJECT_SETTINGS = [
  settings.ML_ANOMALY_DETECTION_RESULTS_ENABLE_TIME_DEFAULTS_ID,
  settings.ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID,
  settings.OBSERVABILITY_ENABLE_COMPARISON_BY_DEFAULT_ID,
  settings.OBSERVABILITY_APM_DEFAULT_SERVICE_ENVIRONMENT_ID,
  settings.OBSERVABILITY_APM_SERVICE_GROUP_MAX_NUMBER_OF_SERVICE_ID,
  settings.OBSERVABILITY_ENABLE_INSPECT_ES_QUERIES_ID,
  settings.OBSERVABILITY_APM_AWS_LAMBDA_PRICE_FACTOR_ID,
  settings.OBSERVABILITY_APM_AWS_LAMBDA_REQUEST_COST_PER_MILLION_ID,
  settings.OBSERVABILITY_APM_PROGRESSIVE_LOADING_ID,
  settings.OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID,
  settings.OBSERVABILITY_APM_ENABLE_TABLE_SEARCH_BAR,
  settings.OBSERVABILITY_APM_ENABLE_SERVICE_INVENTORY_TABLE_SEARCH_BAR,
  settings.OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID,
];

export const OBSERVABILITY_AI_ASSISTANT_PROJECT_SETTINGS = [
  settings.OBSERVABILITY_AI_ASSISTANT_SIMULATED_FUNCTION_CALLING,
  settings.OBSERVABILITY_AI_ASSISTANT_SEARCH_CONNECTOR_INDEX_PATTERN,
  settings.AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
];
