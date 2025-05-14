/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { infra, LogDocument, log } from '@kbn/apm-synthtrace-client';
import { fakerEN as faker } from '@faker-js/faker';
import { z } from '@kbn/zod';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import {
  LogMessageGenerator,
  generateUnstructuredLogMessage,
  unstructuredLogMessageGenerators,
} from './helpers/unstructured_logs';

const scenarioOptsSchema = z.intersection(
  z.object({
    randomSeed: z.number().default(0),
    messageGroup: z
      .enum([
        'httpAccess',
        'userAuthentication',
        'networkEvent',
        'dbOperations',
        'taskOperations',
        'degradedOperations',
        'errorOperations',
      ])
      .default('dbOperations'),
  }),
  z
    .discriminatedUnion('distribution', [
      z.object({
        distribution: z.literal('uniform'),
        rate: z.number().default(1),
      }),
      z.object({
        distribution: z.literal('poisson'),
        rate: z.number().default(1),
      }),
      z.object({
        distribution: z.literal('gaussian'),
        mean: z.coerce.date().describe('Time of the peak of the gaussian distribution'),
        width: z.number().default(5000).describe('Width of the gaussian distribution in ms'),
        totalPoints: z
          .number()
          .default(100)
          .describe('Total number of points in the gaussian distribution'),
      }),
    ])
    .default({ distribution: 'uniform', rate: 1 })
);

type ScenarioOpts = z.output<typeof scenarioOptsSchema>;

const scenario: Scenario<LogDocument> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;
      const scenarioOpts = scenarioOptsSchema.parse(runOptions.scenarioOpts ?? {});

      faker.seed(scenarioOpts.randomSeed);
      faker.setDefaultRefDate(range.from.toISOString());

      logger.debug(`Generating ${scenarioOpts.distribution} logs...`);

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
          : scenarioOpts.distribution === 'poisson'
          ? range.poissonEvents(scenarioOpts.rate)
          : range.gaussianEvents(scenarioOpts.mean, scenarioOpts.width, scenarioOpts.totalPoints);

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

const logMessageGenerators = {
  httpAccess: generateUnstructuredLogMessage([unstructuredLogMessageGenerators.httpAccess]),
  userAuthentication: generateUnstructuredLogMessage([
    unstructuredLogMessageGenerators.userAuthentication,
  ]),
  networkEvent: generateUnstructuredLogMessage([unstructuredLogMessageGenerators.networkEvent]),
  dbOperations: generateUnstructuredLogMessage([unstructuredLogMessageGenerators.dbOperation]),
  taskOperations: generateUnstructuredLogMessage([
    unstructuredLogMessageGenerators.taskStatusSuccess,
  ]),
  degradedOperations: generateUnstructuredLogMessage([
    unstructuredLogMessageGenerators.taskStatusFailure,
  ]),
  errorOperations: generateUnstructuredLogMessage([
    unstructuredLogMessageGenerators.error,
    unstructuredLogMessageGenerators.restart,
  ]),
} satisfies Record<ScenarioOpts['messageGroup'], LogMessageGenerator>;
