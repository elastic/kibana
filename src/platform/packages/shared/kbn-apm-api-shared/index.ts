/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  createCallApmApiV2,
  type APMClientV2,
  type AutoAbortedAPMClientV2,
  type APIReturnType,
} from './src/create_call_apm_api';
export { routeDefinitions } from './src/routes';
export type { SharedAPMRouteRepository } from './src/routes';
export type * from './src/routes/historical_data';
export type * from './src/routes/suggestions';
export type * from './src/routes/agent_keys';
export type * from './src/routes/traces';
export type * from './src/routes/span_links';
export type * from './src/routes/observability_overview';
export type * from './src/routes/agent_explorer';
export type * from './src/routes/alerts';
export type * from './src/routes/assistant_functions';
export type * from './src/routes/correlations';
export type * from './src/routes/custom_dashboards';
export type * from './src/routes/dependencies';
export type * from './src/routes/transactions';
export type * from './src/routes/services';
export type * from './src/routes/service_map';
export type * from './src/routes/errors';
export type * from './src/routes/infrastructure';
export type * from './src/routes/environments';
export type * from './src/routes/event_metadata';
export type * from './src/routes/fallback_to_transactions';
export {
  rangeRt,
  kueryRt,
  probabilityRt,
  offsetRt,
  serviceTransactionDataSourceRt,
  transactionDataSourceRt,
  filtersRt,
} from './src/default_api_types';
export {
  OBSERVABILITY_APM_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
} from './src/cps_feature_flag';
