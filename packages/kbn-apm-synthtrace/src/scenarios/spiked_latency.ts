/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { random } from 'lodash';
import {
  apm,
  log,
  ApmFields,
  generateLongId,
  generateShortId,
  Instance,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const alwaysSpikeTransactionName = 'GET /always-spike';
const sometimesSpikeTransactionName = 'GET /sometimes-spike';

const scenario: Scenario<ApmFields> = async ({ logger }) => {
  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const serviceNames = ['spikey-frontend', 'spikey-backend'];

      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

      const CLUSTER = [
        { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
      ];

      function buildLogs(serviceName: string) {
        return range
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return Array(20)
              .fill(0)
              .map(() => {
                const index = Math.floor(Math.random() * 3);
                const logMessage = `Error message #${generateShortId()} from ${serviceName}`;
                const logLevel = 'error';

                return log
                  .create()
                  .message(logMessage)
                  .logLevel(logLevel)
                  .service(serviceName)
                  .defaults({
                    'trace.id': generateShortId(),
                    'agent.name': 'synth-agent',
                    'orchestrator.cluster.name': CLUSTER[index].clusterName,
                    'orchestrator.cluster.id': CLUSTER[index].clusterId,
                    'orchestrator.resource.id': generateShortId(),
                    'cloud.provider': CLOUD_PROVIDERS[Math.floor(Math.random() * 3)],
                    'cloud.region': CLOUD_REGION[index],
                    'cloud.availability_zone': `${CLOUD_REGION[index]}a`,
                    'cloud.project.id': generateShortId(),
                    'cloud.instance.id': generateShortId(),
                    'log.file.path': `/logs/${generateLongId()}/error.txt`,
                  })
                  .timestamp(timestamp);
              });
          });
      }

      const serviceInstances = serviceNames.map((serviceName) =>
        apm
          .service({ name: serviceName, environment: ENVIRONMENT, agentName: 'go' })
          .instance(`my-instance`)
      );

      const transactionNames = [
        'GET /order',
        'GET /product',
        alwaysSpikeTransactionName,
        sometimesSpikeTransactionName,
      ];

      const buildTransactions = (serviceInstance: Instance, transactionName: string) => {
        const interval = random(1, 100, false);
        const rangeWithInterval = range.interval(`${interval}s`);

        return rangeWithInterval.generator((timestamp, i) => {
          const duration = getDuration(transactionName);
          return serviceInstance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(duration)
            .children(
              serviceInstance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(duration * 0.9)
                .destination('elasticsearch')
                .timestamp(timestamp)
                .outcome('success')
            )
            .success();
        });
      };

      return [
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () =>
            serviceNames.map((serviceName) => buildLogs(serviceName))
          )
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            serviceInstances.flatMap((serviceInstance) =>
              transactionNames.flatMap((transactionName) =>
                buildTransactions(serviceInstance, transactionName)
              )
            )
          )
        ),
      ];
    },
  };
};

function getDuration(transactionName: string) {
  const spikedDuration = random(40000, 41000, false);
  const normalDuration = random(400, 500, false);

  switch (transactionName) {
    case alwaysSpikeTransactionName:
      return spikedDuration;
    case sometimesSpikeTransactionName:
      return Math.random() > 0.01 ? spikedDuration : normalDuration;
    default:
      return normalDuration;
  }
}

export default scenario;
