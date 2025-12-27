/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Serializable } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../cli/scenario';
import { withClient } from '../../../lib/utils/with_client';

const scenario: Scenario = async ({ logger }) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const alertIndex = '.internal.alerts-observability.apm.alerts-default-000001';

      const alerts = range.interval('10m').generator((timestamp) => {
        const date = new Date(timestamp).toISOString();
        const docs = [
          {
            _index: alertIndex,
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
            'service.environment': 'production',
            'service.name': 'checkout-service',
            'kibana.space_ids': ['default'],
            'event.kind': 'signal',
            'event.action': 'open',
            'kibana.alert.workflow_status': 'open',
            tags: ['apm', 'service:checkout-service'],
          },
          {
            _index: alertIndex,
            '@timestamp': timestamp,
            'kibana.alert.start': date,
            'kibana.alert.status': 'active',
            'kibana.alert.rule.name': 'High CPU Usage',
            'kibana.alert.rule.consumer': 'infrastructure',
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.category': 'metrics',
            'kibana.alert.evaluation.threshold': 0.9,
            'kibana.alert.reason': 'CPU usage is 95% on host-01',
            'host.name': 'host-01',
            'kibana.space_ids': ['default'],
            'event.kind': 'signal',
            'event.action': 'open',
            'kibana.alert.workflow_status': 'open',
            tags: ['infra', 'host:host-01'],
          },
        ];

        return docs.map((d) => new Serializable(d));
      });

      return withClient(logsEsClient, alerts);
    },
  };
};

export default scenario;
