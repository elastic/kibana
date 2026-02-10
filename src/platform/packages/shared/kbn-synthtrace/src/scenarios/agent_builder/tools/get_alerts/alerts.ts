/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Synthetic Alerts
 *
 * Story: Generates synthetic alert documents directly in the alerts index
 * for testing tools that query alerts. This bypasses the alerting framework
 * to create deterministic test data.
 *
 * NOTE: This scenario is primarily for CLI/debugging purposes. For API tests
 * that need to trigger real alerts, use the `apm_errors` scenario instead
 * which generates APM error data that can trigger actual alert rules.
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_alerts",
 *   "tool_params": {}
 * }
 * ```
 */

import { Serializable } from '@kbn/synthtrace-client';
import type { Timerange } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

const ALERT_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';

export function generateSyntheticAlerts({
  range,
  logsEsClient,
  serviceName,
  hostName,
  environment,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  serviceName: string;
  hostName: string;
  environment: string;
}): ScenarioReturnType<Record<string, unknown>> {
  const alerts = range.interval('10m').generator((timestamp) => {
    const date = new Date(timestamp).toISOString();
    const docs = [
      {
        _index: ALERT_INDEX,
        '@timestamp': timestamp,
        'kibana.alert.start': date,
        'kibana.alert.end': new Date(timestamp + 60000).toISOString(),
        'kibana.alert.status': 'active',
        'kibana.alert.rule.name': 'High Transaction Error Rate',
        'kibana.alert.rule.consumer': 'apm',
        'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
        'kibana.alert.rule.category': 'error',
        'kibana.alert.evaluation.threshold': 0.05,
        'kibana.alert.reason': 'Transaction error rate is 8.5% (threshold: 5%)',
        'service.environment': environment,
        'service.name': serviceName,
        'kibana.space_ids': ['default'],
        'event.kind': 'signal',
        'event.action': 'open',
        'kibana.alert.workflow_status': 'open',
        tags: ['apm', `service:${serviceName}`],
      },
      {
        _index: ALERT_INDEX,
        '@timestamp': timestamp,
        'kibana.alert.start': date,
        'kibana.alert.status': 'active',
        'kibana.alert.rule.name': 'High CPU Usage',
        'kibana.alert.rule.consumer': 'infrastructure',
        'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
        'kibana.alert.rule.category': 'metrics',
        'kibana.alert.evaluation.threshold': 0.9,
        'kibana.alert.reason': `CPU usage is 95% on ${hostName}`,
        'host.name': hostName,
        'kibana.space_ids': ['default'],
        'event.kind': 'signal',
        'event.action': 'open',
        'kibana.alert.workflow_status': 'open',
        tags: ['infra', `host:${hostName}`],
      },
    ];

    return docs.map((d) => new Serializable(d));
  });

  return withClient(logsEsClient, alerts);
}

export default createCliScenario(({ range, clients: { logsEsClient } }) =>
  generateSyntheticAlerts({
    range,
    logsEsClient,
    serviceName: 'checkout-service',
    hostName: 'host-01',
    environment: 'production',
  })
);
