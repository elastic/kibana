/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { infra, LogDocument, log } from '@kbn/apm-synthtrace-client';
import { fakerEN as faker } from '@faker-js/faker';
import { z } from 'zod';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  generateUnstructuredLogMessage,
  unstructuredLogMessageGenerators,
} from './helpers/unstructured_logs';

const scenarioOptsSchema = z.object({
  randomSeed: z.number().default(0),
  distribution: z.enum(['uniform', 'poisson']).default('uniform'),
  rate: z.number().default(1),
  messageGroup: z
    .enum(['healthyOperations', 'degradedOperations', 'errorOperations'])
    .default('healthyOperations'),
});

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;
      const scenarioOpts = scenarioOptsSchema.parse(runOptions.scenarioOpts ?? {});

      faker.seed(scenarioOpts.randomSeed);
      faker.setDefaultRefDate(range.from.toISOString());

      logger.debug(
        `Generating ${scenarioOpts.distribution} logs with a rate of ${scenarioOpts.rate}...`
      );

      // Logs Data logic
      const LOG_LEVELS = ['info', 'debug', 'error', 'warn', 'trace', 'fatal'];

      const clusterDefinions = [
        {
          'orchestrator.cluster.id': faker.string.nanoid(),
          'orchestrator.cluster.name': 'synth-cluster-1',
          'orchestrator.namespace': 'default',
          'cloud.provider': 'gcp',
          'cloud.region': 'eu-central-1',
          'cloud.availability_zone': 'eu-central-1a',
          'cloud.project.id': faker.string.nanoid(),
        },
        {
          'orchestrator.cluster.id': faker.string.nanoid(),
          'orchestrator.cluster.name': 'synth-cluster-2',
          'orchestrator.namespace': 'production',
          'cloud.provider': 'aws',
          'cloud.region': 'us-east-1',
          'cloud.availability_zone': 'us-east-1a',
          'cloud.project.id': faker.string.nanoid(),
        },
        {
          'orchestrator.cluster.id': faker.string.nanoid(),
          'orchestrator.cluster.name': 'synth-cluster-3',
          'orchestrator.namespace': 'kube',
          'cloud.provider': 'azure',
          'cloud.region': 'area-51',
          'cloud.availability_zone': 'area-51a',
          'cloud.project.id': faker.string.nanoid(),
        },
      ];

      const hostEntities = [
        {
          'host.name': 'host-1',
          'agent.id': 'synth-agent-1',
          'agent.name': 'nodejs',
          'cloud.instance.id': faker.string.nanoid(),
          'orchestrator.resource.id': faker.string.nanoid(),
          ...clusterDefinions[0],
        },
        {
          'host.name': 'host-2',
          'agent.id': 'synth-agent-2',
          'agent.name': 'custom',
          'cloud.instance.id': faker.string.nanoid(),
          'orchestrator.resource.id': faker.string.nanoid(),
          ...clusterDefinions[1],
        },
        {
          'host.name': 'host-3',
          'agent.id': 'synth-agent-3',
          'agent.name': 'python',
          'cloud.instance.id': faker.string.nanoid(),
          'orchestrator.resource.id': faker.string.nanoid(),
          ...clusterDefinions[2],
        },
      ].map((hostDefinition) =>
        infra.minimalHost(hostDefinition['host.name']).overrides(hostDefinition)
      );

      const serviceNames = Array(3)
        .fill(null)
        .map((_, idx) => `synth-service-${idx}`);

      const generatorFactory =
        scenarioOpts.distribution === 'uniform'
          ? range.interval('1s').rate(scenarioOpts.rate)
          : range.poissonEvents(scenarioOpts.rate);

      const logs = generatorFactory.generator((timestamp) => {
        const entity = faker.helpers.arrayElement(hostEntities);
        const serviceName = faker.helpers.arrayElement(serviceNames);
        const level = faker.helpers.arrayElement(LOG_LEVELS);
        const messages = logMessageGenerators[scenarioOpts.messageGroup](faker);

        return messages.map((message) =>
          log
            .createMinimal()
            .message(message)
            .logLevel(level)
            .service(serviceName)
            .overrides({
              ...entity.fields,
              labels: {
                scenario: 'rare',
                population: scenarioOpts.distribution,
              },
            })
            .timestamp(timestamp)
        );
      });

      return [
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => [logs])
        ),
      ];
    },
  };
};

export default scenario;

const healthyLogMessageGenerators = [
  unstructuredLogMessageGenerators.dbOperation,
  unstructuredLogMessageGenerators.taskStatusSuccess,
];

const degradedLogMessageGenerators = [unstructuredLogMessageGenerators.taskStatusFailure];

const errorLogMessageGenerators = [
  unstructuredLogMessageGenerators.error,
  unstructuredLogMessageGenerators.restart,
];

const logMessageGenerators = {
  healthyOperations: generateUnstructuredLogMessage(healthyLogMessageGenerators),
  degradedOperations: generateUnstructuredLogMessage(degradedLogMessageGenerators),
  errorOperations: generateUnstructuredLogMessage(errorLogMessageGenerators),
};
