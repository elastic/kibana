/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Generated Data Sources
 *
 * Story: Generates minimal data across Logs, Metrics, and APM to verify `get_data_sources`.
 *
 * Validate via:
 *
 * ```
 * POST kbn:///api/agent_builder/tools/_execute
 * {
 *   "tool_id": "observability.get_data_sources",
 *   "tool_params": {}
 * }
 * ```
 */

import type { ApmFields, LogDocument, InfraDocument } from '@kbn/synthtrace-client';
import { apm, log, infra } from '@kbn/synthtrace-client';
import type { Scenario } from '../../../cli/scenario';
import { withClient } from '../../../lib/utils/with_client';

const scenario: Scenario<LogDocument | ApmFields | InfraDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient, apmEsClient, infraEsClient } }) => {
      // 1. Logs
      const logs = range
        .interval('1h')
        .generator((timestamp) =>
          log.create().message('Test log for data sources').timestamp(timestamp)
        );

      // 2. APM
      const traces = range.interval('1h').generator((timestamp) =>
        apm
          .service({
            name: 'test-service',
            environment: 'production',
            agentName: 'nodejs',
          })
          .instance('test-instance')
          .transaction('test-txn')
          .timestamp(timestamp)
      );

      // 3. Metrics (Infra)
      const metrics = range
        .interval('1h')
        .generator((timestamp) => [
          infra.host('test-host').cpu({ 'system.cpu.total.norm.pct': 0.1 }).timestamp(timestamp),
        ]);

      return [
        withClient(logsEsClient, logs),
        withClient(apmEsClient, traces),
        withClient(infraEsClient, metrics),
      ];
    },
  };
};

export default scenario;
