/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates one APM service per entry in the metrics dashboard catalog, covering
 * all static dashboard types (classic APM, EDOT, vanilla OTel, OTel-native) plus
 * non-dashboard variations (JRuby JVM metrics, Go classic agent, Ruby classic).
 *
 * Each service emits transactions and the exact metric fields its corresponding
 * dashboard panels query so the panels render with data.
 *
 * Usage:
 *   node scripts/synthtrace apm_metrics_dashboards --live
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  APM_METRICS_ALL_SERVICES,
  createMetricsServiceInstance,
  generateAppMetrics,
} from './helpers/apm_metrics_dashboards';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = APM_METRICS_ALL_SERVICES.map((config) =>
        createMetricsServiceInstance(config, ENVIRONMENT)
      );

      return withClient(
        apmEsClient,
        instances.flatMap(({ instance, config }) => [
          range
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /api/data' })
                .timestamp(timestamp)
                .duration(200)
                .success()
            ),
          range
            .interval('30s')
            .rate(1)
            .generator((timestamp) => generateAppMetrics(instance, config, timestamp)),
        ])
      );
    },
  };
};

export default scenario;
