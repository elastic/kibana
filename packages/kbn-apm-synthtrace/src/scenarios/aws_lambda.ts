/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../..';
import { ApmFields } from '../lib/apm/apm_fields';
import { Scenario } from '../cli/scenario';
import { getLogger } from '../cli/utils/get_common_services';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  const logger = getLogger(runOptions);

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);
      const timestamps = range.ratePerMinute(180);

      const instance = apm
        .service({ name: 'lambda-python', environment: ENVIRONMENT, agentName: 'python' })
        .instance('instance');

      const traceEventsSetups = [
        { functionName: 'lambda-python-1', coldStart: true },
        { functionName: 'lambda-python-2', coldStart: false },
      ];

      const traceEvents = ({ functionName, coldStart }: typeof traceEventsSetups[0]) => {
        return timestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName: 'GET /order/{id}' })
            .defaults({
              'service.runtime.name': 'AWS_Lambda_python3.8',
              'cloud.provider': 'aws',
              'cloud.service.name': 'lambda',
              'cloud.region': 'us-east-1',
              'faas.id': `arn:aws:lambda:us-west-2:123456789012:function:${functionName}`,
              'faas.coldstart': coldStart,
              'faas.trigger.type': 'other',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success()
        );
      };

      return traceEventsSetups
        .map((traceEventsSetup) =>
          logger.perf('generating_apm_events', () => traceEvents(traceEventsSetup))
        )
        .reduce((p, c) => p.merge(c));
    },
  };
};

export default scenario;
