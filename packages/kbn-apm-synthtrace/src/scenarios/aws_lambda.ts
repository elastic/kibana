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

      const instanceLambdaPython = apm
        .serverless({
          serviceName: 'lambda-python',
          environment: ENVIRONMENT,
          agentName: 'python',
          faasId: 'arn:aws:lambda:us-west-2:123456789012:function:lambda-python',
          coldStart: true,
          faasTriggerType: 'other',
        })
        .instance('instance');

      const instanceLambdaNode = apm
        .serverless({
          serviceName: 'lambda-node',
          environment: ENVIRONMENT,
          agentName: 'nodejs',
          faasId: 'arn:aws:lambda:us-west-2:123456789012:function:lambda-node',
          coldStart: false,
          faasTriggerType: 'other',
        })
        .instance('instance b');

      const awsLambdaEvents = timestamps.generator((timestamp) => {
        const cloudFields: ApmFields = {
          'cloud.provider': 'aws',
          'cloud.service.name': 'lambda',
          'cloud.region': 'us-east-1',
        };
        return [
          instanceLambdaPython
            .transaction('GET /order/{id}')
            .defaults({
              ...cloudFields,
              'service.runtime.name': 'AWS_Lambda_python3.8',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success(),
          instanceLambdaNode
            .transaction('PUT /order/{id}')
            .defaults({
              ...cloudFields,
              'service.runtime.name': 'AWS_Lambda_nodejs16.x',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success(),
        ];
      });

      const metricsets = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const metrics: ApmFields = {
            'system.memory.actual.free': 94371840, // ~0.08 gb
            'system.memory.total': 94371840, // ~0.08 gb;
            'system.cpu.total.norm.pct': 0.6,
            'system.process.cpu.total.norm.pct': 0.7,
            'faas.billed_duration': 4000,
            'faas.timeout': 10000,
            'faas.duration': 4000,
          };
          return [
            instanceLambdaPython
              .appMetrics({
                ...metrics,
                'faas.coldstart_duration': 4000,
              })
              .timestamp(timestamp),
            instanceLambdaNode
              .appMetrics({
                ...metrics,
                'faas.coldstart_duration': 0,
              })
              .timestamp(timestamp),
          ];
        });

      return awsLambdaEvents.merge(metricsets);
    },
  };
};

export default scenario;
