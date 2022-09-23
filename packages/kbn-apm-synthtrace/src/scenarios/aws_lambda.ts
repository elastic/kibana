/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../..';
import { Scenario } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { ApmFields } from '../lib/apm/apm_fields';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);
      const timestamps = range.ratePerMinute(180);

      const cloudFields: ApmFields = {
        'cloud.provider': 'aws',
        'cloud.service.name': 'lambda',
        'cloud.region': 'us-west-2',
      };

      const instanceALambdaPython = apm
        .serverlessFunction({
          serviceName: 'aws-lambdas',
          environment: ENVIRONMENT,
          agentName: 'python',
          functionName: 'fn-python-1',
        })
        .instance({ instanceName: 'instance_A', ...cloudFields });

      const instanceALambdaNode = apm
        .serverlessFunction({
          serviceName: 'aws-lambdas',
          environment: ENVIRONMENT,
          agentName: 'nodejs',
          functionName: 'fn-node-1',
        })
        .instance({ instanceName: 'instance_A', ...cloudFields });

      const instanceALambdaNode2 = apm
        .serverlessFunction({
          environment: ENVIRONMENT,
          agentName: 'nodejs',
          functionName: 'fn-node-2',
        })
        .instance({ instanceName: 'instance_A', ...cloudFields });

      const memory = {
        total: 536870912, // 0.5gb
        free: 94371840, // ~0.08 gb
      };

      const awsLambdaEvents = timestamps.generator((timestamp) => {
        return [
          instanceALambdaPython
            .invocation()
            .duration(1000)
            .timestamp(timestamp)
            .coldStart(true)
            .billedDuration(4000)
            .faasTimeout(10000)
            .memory(memory)
            .coldStartDuration(4000)
            .faasDuration(4000),
          instanceALambdaNode
            .invocation()
            .duration(1000)
            .timestamp(timestamp)
            .coldStart(false)
            .billedDuration(4000)
            .faasTimeout(10000)
            .memory(memory)
            .faasDuration(4000),
          instanceALambdaNode2
            .invocation()
            .duration(1000)
            .timestamp(timestamp)
            .coldStart(false)
            .billedDuration(4000)
            .faasTimeout(10000)
            .memory(memory)
            .faasDuration(4000),
        ];
      });

      return awsLambdaEvents;
    },
  };
};

export default scenario;
