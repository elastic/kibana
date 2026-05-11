/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { historicalDataRouteDefinitions } from './historical_data';
import { suggestionsRouteDefinitions } from './suggestions';
import { agentKeysRouteDefinitions } from './agent_keys';
import { tracesRouteDefinitions } from './traces';
import { spanLinksRouteDefinitions } from './span_links';
import { observabilityOverviewRouteDefinitions } from './observability_overview';
import { agentExplorerRouteDefinitions } from './agent_explorer';
import { alertsRouteDefinitions } from './alerts';
import { assistantFunctionsRouteDefinitions } from './assistant_functions';
import { correlationsRouteDefinitions } from './correlations';
import { customDashboardsRouteDefinitions } from './custom_dashboards';
import { dependenciesRouteDefinitions } from './dependencies';
import { transactionsRouteDefinitions } from './transactions';
import { servicesRouteDefinitions } from './services';
import { serviceMapRouteDefinitions } from './service_map';
import { errorsRouteDefinitions } from './errors';
import { infrastructureRouteDefinitions } from './infrastructure';
import { environmentsRouteDefinitions } from './environments';
import { eventMetadataRouteDefinitions } from './event_metadata';
import { fallbackToTransactionsRouteDefinitions } from './fallback_to_transactions';
import { latencyDistributionRouteDefinitions } from './latency_distribution';
import { metricsRouteDefinitions } from './metrics';
import { profilingRouteDefinitions } from './profiling';
import { serviceGroupsRouteDefinitions } from './service_groups';
import { timeRangeMetadataRouteDefinitions } from './time_range_metadata';
import { customLinksRouteDefinitions } from './custom_links';
import { anomalyDetectionRouteDefinitions } from './anomaly_detection';
import type { BuildGroupedRepository } from './types';

export const routeDefinitions = {
  historicalData: historicalDataRouteDefinitions,
  suggestions: suggestionsRouteDefinitions,
  agentKeys: agentKeysRouteDefinitions,
  traces: tracesRouteDefinitions,
  spanLinks: spanLinksRouteDefinitions,
  observabilityOverview: observabilityOverviewRouteDefinitions,
  agentExplorer: agentExplorerRouteDefinitions,
  alerts: alertsRouteDefinitions,
  assistantFunctions: assistantFunctionsRouteDefinitions,
  correlations: correlationsRouteDefinitions,
  customDashboards: customDashboardsRouteDefinitions,
  dependencies: dependenciesRouteDefinitions,
  transactions: transactionsRouteDefinitions,
  services: servicesRouteDefinitions,
  serviceMap: serviceMapRouteDefinitions,
  errors: errorsRouteDefinitions,
  infrastructure: infrastructureRouteDefinitions,
  environments: environmentsRouteDefinitions,
  eventMetadata: eventMetadataRouteDefinitions,
  fallbackToTransactions: fallbackToTransactionsRouteDefinitions,
  latencyDistribution: latencyDistributionRouteDefinitions,
  metrics: metricsRouteDefinitions,
  profiling: profilingRouteDefinitions,
  serviceGroups: serviceGroupsRouteDefinitions,
  timeRangeMetadata: timeRangeMetadataRouteDefinitions,
  customLinks: customLinksRouteDefinitions,
  anomalyDetection: anomalyDetectionRouteDefinitions,
};

export type SharedAPMRouteRepository = BuildGroupedRepository<typeof routeDefinitions>;
