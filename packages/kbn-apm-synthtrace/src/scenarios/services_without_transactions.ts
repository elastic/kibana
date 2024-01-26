/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { apm, ApmFields } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const withTx = apm
        .service('service-with-transactions', ENVIRONMENT, 'java')
        .instance('instance');

      const withErrorsOnly = apm
        .service('service-with-errors-only', ENVIRONMENT, 'java')
        .instance('instance');

      const withAppMetricsOnly = apm
        .service('service-with-app-metrics-only', ENVIRONMENT, 'java')
        .instance('instance');

      const data = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            withTx.transaction('GET /api').duration(100).timestamp(timestamp),
            withErrorsOnly
              .error({
                message: 'An unknown error occurred',
              })
              .timestamp(timestamp),
            withAppMetricsOnly
              .appMetrics({
                'system.memory.actual.free': 1,
                'system.memory.total': 2,
              })
              .timestamp(timestamp),
          ];
        });

      return withClient(apmEsClient, data);
    },
  };
};

export default scenario;
