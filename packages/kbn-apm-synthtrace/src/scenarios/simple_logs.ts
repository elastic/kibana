/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { LogDocument, log, generateShortId, generateLongId } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      // Logs Data logic
      const MESSAGE_LOG_LEVELS = [
        { message: 'A simple log', level: 'info' },
        { message: 'Yet another debug log', level: 'debug' },
        { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
      ];
      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

      const CLUSTER = [
        { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
      ];

      const SERVICE_NAMES = Array(3)
        .fill(null)
        .map((_, idx) => `synth-service-${idx}`);

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .message(MESSAGE_LOG_LEVELS[index].message)
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(SERVICE_NAMES[index])
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

      const logsWithNoLogLevel = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .service(SERVICE_NAMES[index])
                .defaults({
                  'trace.id': generateShortId(),
                  'error.message': MESSAGE_LOG_LEVELS[index].message,
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

      const logsWithErrorMessage = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(SERVICE_NAMES[index])
                .defaults({
                  'trace.id': generateShortId(),
                  'error.message': MESSAGE_LOG_LEVELS[index].message,
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

      const logsWithEventMessage = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(SERVICE_NAMES[index])
                .defaults({
                  'trace.id': generateShortId(),
                  'event.original': MESSAGE_LOG_LEVELS[index].message,
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

      const logsWithNoMessage = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(SERVICE_NAMES[index])
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

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => [
          logs,
          logsWithNoLogLevel,
          logsWithErrorMessage,
          logsWithEventMessage,
          logsWithNoMessage,
        ])
      );
    },
  };
};

export default scenario;
