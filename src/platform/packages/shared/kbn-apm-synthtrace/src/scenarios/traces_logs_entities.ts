/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apm,
  generateLongId,
  generateShortId,
  Instance,
  log,
  entities,
  EntityFields,
} from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log with something random <random> in the middle', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];

const SYNTH_JAVA_TRACE_ENTITY_ID = generateShortId();
const SYNTH_NODE_TRACES_LOGS_ENTITY_ID = generateShortId();
const SYNTH_GO_LOGS_ENTITY_ID = generateShortId();

const scenario: Scenario<Partial<EntityFields>> = async (runOptions) => {
  const { logger } = runOptions;
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    bootstrap: async ({ entitiesKibanaClient, logsEsClient }) => {
      await entitiesKibanaClient.installEntityIndexPatterns();
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { entitiesEsClient, logsEsClient, apmEsClient } }) => {
      const transactionName = '240rpm/75% 1000ms';

      const entityHistoryTimestamps = range.interval('1m').rate(1);
      const successfulTimestamps = range.interval('1m').rate(1);
      const failedTimestamps = range.interval('1m').rate(1);

      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp),
              instance
                .span({ spanName: 'custom_operation', spanType: 'custom' })
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(600)
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
                .timestamp(timestamp + 50)
            )
        );

        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [...successfulTraceEvents, ...failedTraceEvents, ...metricsets];
      };

      const SYNTH_JAVA_TRACE = 'synth-java-trace';
      const apmOnlyInstance = apm
        .service({ name: SYNTH_JAVA_TRACE, agentName: 'java', environment: ENVIRONMENT })
        .instance('intance');
      const apmOnlyEvents = instanceSpans(apmOnlyInstance);
      const synthJavaTraces = entities.serviceEntity({
        serviceName: SYNTH_JAVA_TRACE,
        agentName: ['java'],
        dataStreamType: ['traces'],
        environment: ENVIRONMENT,
        entityId: SYNTH_JAVA_TRACE_ENTITY_ID,
      });

      const SYNTH_NODE_TRACE_LOGS = 'synth-node-trace-logs';
      const apmAndLogsInstance = apm
        .service({ name: SYNTH_NODE_TRACE_LOGS, agentName: 'nodejs', environment: ENVIRONMENT })
        .instance('intance');
      const apmAndLogsApmEvents = instanceSpans(apmAndLogsInstance);
      const apmAndLogsLogsEvents = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              const { message, level } = MESSAGE_LOG_LEVELS[index];
              const CLUSTER = {
                clusterId: generateShortId(),
                clusterName: 'synth-cluster-2',
                namespace: 'production',
              };

              return log
                .create({ isLogsDb })
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(SYNTH_NODE_TRACE_LOGS)
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER.clusterName,
                  'orchestrator.cluster.id': CLUSTER.clusterId,
                  'orchestrator.namespace': CLUSTER.namespace,
                  'container.name': `${SYNTH_NODE_TRACE_LOGS}-${generateShortId()}`,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': 'gcp',
                  'cloud.region': 'eu-central-1',
                  'cloud.availability_zone': 'eu-central-1a',
                  'log.level': 'error',
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                })
                .timestamp(timestamp);
            });
        });
      const synthNodeTracesLogs = entities.serviceEntity({
        serviceName: SYNTH_NODE_TRACE_LOGS,
        agentName: ['nodejs'],
        dataStreamType: ['traces', 'logs'],
        environment: ENVIRONMENT,
        entityId: SYNTH_NODE_TRACES_LOGS_ENTITY_ID,
      });

      const SYNTH_GO_LOGS = 'synth-go-logs';
      const logsEvents = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              const { message, level } = MESSAGE_LOG_LEVELS[index];
              const CLUSTER = {
                clusterId: generateShortId(),
                clusterName: 'synth-cluster-2',
                namespace: 'production',
              };

              return log
                .create({ isLogsDb })
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(SYNTH_GO_LOGS)
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER.clusterName,
                  'orchestrator.cluster.id': CLUSTER.clusterId,
                  'orchestrator.namespace': CLUSTER.namespace,
                  'container.name': `${SYNTH_GO_LOGS}-${generateShortId()}`,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': 'gcp',
                  'cloud.region': 'eu-central-1',
                  'cloud.availability_zone': 'eu-central-1a',
                  'log.level': 'error',
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                })
                .timestamp(timestamp);
            });
        });
      const synthGoTraces = entities.serviceEntity({
        serviceName: SYNTH_GO_LOGS,
        agentName: ['go'],
        dataStreamType: ['logs'],
        environment: ENVIRONMENT,
        entityId: SYNTH_GO_LOGS_ENTITY_ID,
      });

      const entitiesEvents = entityHistoryTimestamps.generator((timestamp) => {
        return [
          synthNodeTracesLogs.timestamp(timestamp),
          synthJavaTraces.timestamp(timestamp),
          synthGoTraces.timestamp(timestamp),
        ];
      });

      const apmPython = apm
        .service({ name: 'synth-python', agentName: 'python', environment: ENVIRONMENT })
        .instance('intance');
      const apmPythonEvents = instanceSpans(apmPython);

      return [
        withClient(
          entitiesEsClient,
          logger.perf('generating_entities_events', () => entitiesEvents)
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () =>
            Readable.from(Array.from(apmAndLogsLogsEvents).concat(Array.from(logsEvents)))
          )
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            Readable.from(
              Array.from(apmOnlyEvents).concat(
                Array.from(apmAndLogsApmEvents).concat(Array.from(apmPythonEvents))
              )
            )
          )
        ),
      ];
    },
  };
};

export default scenario;
