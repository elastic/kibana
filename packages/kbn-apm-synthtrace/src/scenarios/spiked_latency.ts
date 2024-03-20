/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { random, times } from 'lodash';
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

      const CLUSTER_COUNT = 3;
      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];
      const CLUSTERS = times(CLUSTER_COUNT).map((index) => ({
        clusterName: `synth-cluster-${index}`,
        clusterId: generateShortId(),
        projectId: generateShortId(),
        ressourceId: generateShortId(),
        instanceId: generateShortId(),
        cloudProvider: CLOUD_PROVIDERS[index],
        cloudRegion: CLOUD_REGION[index],
      }));

      function buildLogs(serviceName: string) {
        return range
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return Array(20)
              .fill(0)
              .map(() => {
                const clusterIndex = Math.floor(Math.random() * CLUSTER_COUNT);
                const {
                  clusterId,
                  clusterName,
                  projectId,
                  ressourceId,
                  instanceId,
                  cloudRegion,
                  cloudProvider,
                } = CLUSTERS[clusterIndex];

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
                    'orchestrator.cluster.name': clusterName,
                    'orchestrator.cluster.id': clusterId,
                    'orchestrator.resource.id': ressourceId,
                    'cloud.provider': cloudProvider,
                    'cloud.region': cloudRegion,
                    'cloud.availability_zone': `${CLOUD_REGION[clusterIndex]}a`,
                    'cloud.project.id': projectId,
                    'cloud.instance.id': instanceId,
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

      const containerId = `spiked-${generateShortId()}`;
      const hostName = `spiked-${generateShortId()}`;

      const buildTransactions = (serviceInstance: Instance, transactionName: string) => {
        const interval = random(1, 100, false);
        const rangeWithInterval = range.interval(`${interval}s`);

        return rangeWithInterval.generator((timestamp, i) => {
          const duration = getDuration(transactionName);
          return serviceInstance
            .containerId(containerId)
            .hostName(hostName)
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
