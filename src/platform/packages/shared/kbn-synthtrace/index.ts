/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  createLogger,
  LogLevel,
  type Logger,
  extendToolingLog,
} from './src/lib/utils/create_logger';

export {
  SynthtraceClientsManager,
  type SynthtraceClients,
  type SynthtraceClientTypes,
  type GetClientsReturn,
} from './src/cli/utils/clients_manager';
export type { ApmSynthtraceEsClient } from './src/lib/apm/client/apm_synthtrace_es_client';
export type { InfraSynthtraceEsClient } from './src/lib/infra/infra_synthtrace_es_client';
export type { LogsSynthtraceEsClient } from './src/lib/logs/logs_synthtrace_es_client';
export type { SyntheticsSynthtraceEsClient } from './src/lib/synthetics/synthetics_synthtrace_es_client';
export {
  addObserverVersionTransform,
  deleteSummaryFieldTransform,
} from './src/lib/utils/transform_helpers';
export { indexAll } from './src/lib/utils/with_client';
export * from './src/scenarios/agent_builder';

export { sigEvents } from './src/lib/service_graph_logs';

export {
  APM_METRICS_SERVICE_NAMES,
  APM_METRICS_DASHBOARD_SERVICES,
  APM_METRICS_NON_DASHBOARD_SERVICES,
  APM_METRICS_ALL_SERVICES,
  SYSTEM_METRICS as APM_SYSTEM_METRICS,
  JAVA_APM_METRICS,
  NODEJS_APM_METRICS,
  OTEL_JAVA_HEAP_METRICS,
  OTEL_JAVA_NON_HEAP_METRICS,
  OTEL_NODEJS_METRICS,
  OTEL_DOTNET_METRICS,
  OTEL_NATIVE_EDOT_JAVA_METRICS,
  OTEL_NATIVE_OTHER_JAVA_METRICS,
  OTEL_PYTHON_METRICS,
  OTEL_GO_METRICS,
  RUBY_JRUBY_METRICS,
  type ApmMetricsServiceConfig,
  type ApmMetricsServiceInstance,
  createMetricsServiceInstance,
  generateAppMetrics,
} from './src/scenarios/helpers/apm_metrics_dashboards';
