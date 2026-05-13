/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { topDependenciesRoute } from './top_dependencies';
import { topDependenciesStatisticsRoute } from './top_dependencies_statistics';
import { upstreamServicesRoute } from './upstream_services';
import { dependencyMetadataRoute } from './metadata';
import { dependencyLatencyChartsRoute } from './latency_charts';
import { dependencyThroughputChartsRoute } from './throughput_charts';
import { dependencyErrorRateChartsRoute } from './error_rate_charts';
import { dependencyOperationsRoute } from './operations';
import { dependencyLatencyDistributionRoute } from './latency_distribution';
import { topDependencySpansRoute } from './top_dependency_spans';

export const dependenciesRouteDefinitions = {
  topDependencies: topDependenciesRoute,
  topDependenciesStatistics: topDependenciesStatisticsRoute,
  upstreamServices: upstreamServicesRoute,
  metadata: dependencyMetadataRoute,
  latencyCharts: dependencyLatencyChartsRoute,
  throughputCharts: dependencyThroughputChartsRoute,
  errorRateCharts: dependencyErrorRateChartsRoute,
  operations: dependencyOperationsRoute,
  latencyDistribution: dependencyLatencyDistributionRoute,
  topDependencySpans: topDependencySpansRoute,
};

export type { TopDependenciesResponse } from './top_dependencies';
export type { DependenciesTimeseriesStatisticsResponse } from './top_dependencies_statistics';
export type { UpstreamServicesForDependencyResponse } from './upstream_services';
export type { MetadataForDependencyResponse, DependencyMetadataRouteResponse } from './metadata';
export type { LatencyChartsDependencyResponse } from './latency_charts';
export type { ThroughputChartsForDependencyResponse } from './throughput_charts';
export type { DependencyErrorRateChartsResponse } from './error_rate_charts';
export type { DependencyOperation, DependencyOperationsResponse } from './operations';
export type { DependencyLatencyDistributionResponse } from './latency_distribution';
export type { DependencySpan, TopDependencySpansResponse } from './top_dependency_spans';
