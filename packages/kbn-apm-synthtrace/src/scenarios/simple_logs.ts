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

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      // Logs Data logic
      const MESSAGE_LOG_LEVELS = [
        { message: 'A simple log with something random <random> in the middle', level: 'info' },
        { message: 'Yet another debug log', level: 'debug' },
        { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
      ];
      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

      const CLUSTER = [
        { clusterId: generateShortId(), clusterName: 'synth-cluster-1', namespace: 'default' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-2', namespace: 'production' },
        { clusterId: generateShortId(), clusterName: 'synth-cluster-3', namespace: 'kube' },
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
              const { message, level } = MESSAGE_LOG_LEVELS[index];
              const serviceName = SERVICE_NAMES[index];

              return log
                .create()
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(serviceName)
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.namespace': CLUSTER[index].namespace,
                  'container.name': `${SERVICE_NAMES[index]}-${generateShortId()}`,
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
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'orchestrator.namespace': CLUSTER[index].namespace,
                  'container.name': `${SERVICE_NAMES[index]}-${generateShortId()}`,
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
                  'error.exception.stacktrace': 'Error message in error.exception.stacktrace',
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'orchestrator.namespace': CLUSTER[index].namespace,
                  'container.name': `${SERVICE_NAMES[index]}-${generateShortId()}`,
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
                  'error.log.stacktrace': 'Error message in error.log.stacktrace',
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'orchestrator.namespace': CLUSTER[index].namespace,
                  'container.name': `${SERVICE_NAMES[index]}-${generateShortId()}`,
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
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.resource.id': generateShortId(),
                  'orchestrator.namespace': CLUSTER[index].namespace,
                  'container.name': `${SERVICE_NAMES[index]}-${generateShortId()}`,
                  'cloud.provider': CLOUD_PROVIDERS[Math.floor(Math.random() * 3)],
                  'cloud.region': CLOUD_REGION[index],
                  'cloud.availability_zone': `${CLOUD_REGION[index]}a`,
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                  'error.stack_trace': 'Error message in error.stack_trace',
                })
                .timestamp(timestamp);
            });
        });

      const malformedDocs = range
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
                .logLevel(MORE_THAN_1024_CHARS)
                .service(SERVICE_NAMES[index])
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.namespace': CLUSTER[index].namespace,
                  'container.name': `${SERVICE_NAMES[index]}-${generateShortId()}`,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': CLOUD_PROVIDERS[Math.floor(Math.random() * 3)],
                  'cloud.region': CLOUD_REGION[index],
                  'cloud.availability_zone': MORE_THAN_1024_CHARS,
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
          malformedDocs,
        ])
      );
    },
  };
};

export default scenario;
