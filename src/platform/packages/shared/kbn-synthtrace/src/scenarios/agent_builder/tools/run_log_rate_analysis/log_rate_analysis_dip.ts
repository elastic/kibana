/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Log rate analysis dip
 *
 * Simulates a commerce platform where:
 * - Healthy background traffic is produced by checkout, payments, and fulfillment services.
 * - An ingest pipeline (`event.dataset: ingest.audit`) steadily emits audit logs but drops out
 *   60 minutes before `range.to`, creating a clear DIP. Log rate analysis should highlight:
 *   - `event.dataset = ingest.audit`, `event.category = pipeline`
 *   - `service.name = ingest-gateway`, `service.version = 1.4.3`
 *   - `kubernetes.namespace = ingest`, `kubernetes.pod.name = ingest-{0..3}`
 *   - `cloud.region = eu-central-1`, `cloud.availability_zone = euc1b`
 *   - `labels.pipeline_state = healthy`
 *   - Invoke via:
 *     ```
 *     POST kbn:///api/agent_builder/tools/_execute
 *     {
 *       "tool_id": "observability.run_log_rate_analysis",
 *       "tool_params": {
 *         "index": "logs-*",
 *         "baseline": { "start": "now-3h", "end": "now-1h" },
 *         "deviation": { "start": "now-1h", "end": "now" }
 *       }
 *     }
 *     ```
 *
 * The resulting dataset is purpose-built for log rate analysis to find the disappearing ingest
 * cohort when comparing a baseline window (before the drop) with the deviation window (after).
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { generateShortId, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../../cli/scenario';
import { getSynthtraceEnvironment } from '../../../../lib/utils/get_synthtrace_environment';
import { withClient } from '../../../../lib/utils/with_client';
import { parseLogsScenarioOpts } from '../../../helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const PIPELINE_DROP_WINDOW_MS = 60 * 60 * 1000; // drop happens 60 minutes from end

interface Tenant {
  id: string;
  tier: 'gold' | 'platinum' | 'silver' | 'enterprise';
  country: string;
  ips: string[];
}

const TENANTS: Tenant[] = [
  { id: 'retail-co', tier: 'gold', country: 'US', ips: ['10.1.0.15', '10.1.0.18'] },
  { id: 'finbank', tier: 'platinum', country: 'DE', ips: ['10.2.6.21', '10.2.6.35'] },
  { id: 'media-hub', tier: 'silver', country: 'GB', ips: ['10.3.2.44', '10.3.2.55'] },
  { id: 'ent-gov', tier: 'enterprise', country: 'US', ips: ['10.4.9.10', '10.4.9.11'] },
  { id: 'gaming-inc', tier: 'gold', country: 'JP', ips: ['10.5.7.1', '10.5.7.2'] },
];

interface BaseServiceConfig {
  name: string;
  dataset: string;
  version: string;
  namespace: string;
  podPrefix: string;
  domain: string;
  path: string;
  region: string;
  method: string;
  eventAction: string;
  environment: string;
  logger: string;
  flagKey: string;
  flagVariant: string;
  statusCodes: number[];
}

const BASE_SERVICES: BaseServiceConfig[] = [
  {
    name: 'checkout-service',
    dataset: 'web.checkout',
    version: '3.8.5',
    namespace: 'checkout',
    podPrefix: 'checkout-app',
    domain: 'checkout.internal',
    path: '/api/checkout',
    region: 'us-east-2',
    method: 'POST',
    eventAction: 'checkout',
    environment: 'production',
    logger: 'checkout-handler',
    flagKey: 'checkout_dynamic_pricing',
    flagVariant: 'enabled',
    statusCodes: [200, 201, 429],
  },
  {
    name: 'fulfillment-service',
    dataset: 'fulfillment.worker',
    version: '5.4.1',
    namespace: 'fulfillment',
    podPrefix: 'fulfillment-worker',
    domain: 'fulfillment.internal',
    path: '/worker/dispatch',
    region: 'us-west-2',
    method: 'PUT',
    eventAction: 'dispatch',
    environment: 'production',
    logger: 'fulfillment-worker',
    flagKey: 'robotics_slotting',
    flagVariant: 'partial',
    statusCodes: [200, 202, 500],
  },
  {
    name: 'payments-service',
    dataset: 'payments.api',
    version: '2.12.3',
    namespace: 'payments',
    podPrefix: 'payments-blue',
    domain: 'payments.internal',
    path: '/api/payments',
    region: 'us-east-1',
    method: 'POST',
    eventAction: 'authorize',
    environment: 'production',
    logger: 'payments-router',
    flagKey: 'payments_edge_failover',
    flagVariant: 'disabled',
    statusCodes: [200, 201, 400],
  },
];

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;
      const pipelineDropStart = range.to.getTime() - PIPELINE_DROP_WINDOW_MS;
      const timestamps = range.interval('30s');

      const logs = timestamps.rate(1).generator((timestamp, index) => {
        return [
          ...generateCoreAppLogs({
            timestamp,
            index,
            isLogsDb,
          }),
          ...generateAuditPipelineLogs({
            timestamp,
            index,
            isLogsDb,
            isHealthy: timestamp < pipelineDropStart,
          }),
        ];
      });

      return withClient(
        logsEsClient,
        logger.perf('generating_log_rate_analysis_incident_logs', () => logs)
      );
    },
  };
};

function generateCoreAppLogs({
  timestamp,
  index,
  isLogsDb,
}: {
  timestamp: number;
  index: number;
  isLogsDb: boolean;
}) {
  return BASE_SERVICES.map((service, serviceIndex) => {
    const tenant = TENANTS[(index + serviceIndex) % TENANTS.length];
    const statusCode = service.statusCodes[(index + serviceIndex) % service.statusCodes.length];
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info';
    const orderId = (index * 37 + serviceIndex * 11) % 5000;
    const clientIp = tenant.ips[(index + serviceIndex) % tenant.ips.length];

    return log
      .create({ isLogsDb })
      .dataset(service.dataset)
      .service(service.name)
      .message(
        `[${service.name}] tenant=${tenant.id} path=${service.path} status=${statusCode} order=${orderId}`
      )
      .logLevel(logLevel)
      .defaults({
        'service.version': service.version,
        'service.environment': ENVIRONMENT,
        'event.dataset': service.dataset,
        'event.category': 'application',
        'event.outcome': statusCode >= 400 ? 'failure' : 'success',
        'http.request.method': service.method,
        'http.response.status_code': statusCode,
        'url.path': service.path,
        'cloud.provider': 'aws',
        'cloud.region': service.region,
        'cloud.availability_zone': `${service.region}${serviceIndex % 2 === 0 ? 'a' : 'b'}`,
        'kubernetes.namespace': service.namespace,
        'kubernetes.pod.name': `${service.podPrefix}-${(index + serviceIndex) % 6}`,
        'host.name': `${service.podPrefix}-host-${serviceIndex}`,
        'client.ip': clientIp,
        labels: {
          tenant_id: tenant.id,
          tenant_tier: tenant.tier,
          tenant_country: tenant.country,
          feature_flag_key: service.flagKey,
          feature_flag_variant: service.flagVariant,
          service_region: service.region,
        },
        'trace.id': generateShortId(),
      })
      .timestamp(timestamp);
  });
}

function generateAuditPipelineLogs({
  timestamp,
  index,
  isLogsDb,
  isHealthy,
}: {
  timestamp: number;
  index: number;
  isLogsDb: boolean;
  isHealthy: boolean;
}) {
  const tenant = TENANTS[index % TENANTS.length];
  const batchId = (index * 13) % 2000;
  const shouldEmit = isHealthy || (index + Math.floor(timestamp / 60000)) % 20 === 0;

  if (!shouldEmit) {
    return [];
  }

  const repeats = isHealthy ? 8 : 1;

  return Array(repeats)
    .fill(0)
    .map((_, repeat) =>
      log
        .create({ isLogsDb })
        .dataset('ingest.audit')
        .service('ingest-gateway')
        .message(
          `AUDIT pipeline orders-audit v1 ${
            isHealthy ? 'forwarded' : 'backlog'
          } batch=${batchId} part=${repeat} tenant=${tenant.id}`
        )
        .logLevel(isHealthy ? 'info' : 'warning')
        .defaults({
          'service.version': '1.4.3',
          'service.environment': ENVIRONMENT,
          'event.dataset': 'ingest.audit',
          'event.category': 'pipeline',
          'event.outcome': 'success',
          'input.type': 's3',
          'cloud.provider': 'aws',
          'cloud.region': 'eu-central-1',
          'cloud.availability_zone': 'euc1b',
          'kubernetes.namespace': 'ingest',
          'kubernetes.pod.name': `ingest-${(batchId + repeat) % 4}`,
          'client.ip': tenant.ips[0],
          labels: {
            tenant_id: tenant.id,
            tenant_tier: tenant.tier,
            pipeline_state: isHealthy ? 'healthy' : 'dropping',
            pipeline_id: 'orders-audit-v1',
          },
          'trace.id': generateShortId(),
        })
        .timestamp(timestamp)
    );
}

export default scenario;
