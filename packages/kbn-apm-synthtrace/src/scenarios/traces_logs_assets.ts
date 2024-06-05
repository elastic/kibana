/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  apm,
  ApmFields,
  generateLongId,
  generateShortId,
  infra,
  Instance,
  log,
  Serializable,
} from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;
  const { numServices = 3, numHosts = 10 } = runOptions.scenarioOpts || {};

  return {
    generate: ({
      range,
      clients: { apmEsClient, assetsEsClient, logsEsClient, infraEsClient },
    }) => {
      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.interval('1m').rate(1);
      const failedTimestamps = range.interval('1m').rate(1);
      const serviceNames = [...Array(numServices).keys()].map((index) => `synth-node-${index}`);

      const HOSTS = Array(numHosts)
        .fill(0)
        .map((_, idx) => infra.host(`my-host-${idx}`));

      const hosts = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          HOSTS.flatMap((host) => [
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ])
        );

      const instances = serviceNames.map((serviceName) =>
        apm
          .service({ name: serviceName, environment: ENVIRONMENT, agentName: 'nodejs' })
          .instance('instance')
      );
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
            .duration(1000)
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

      const MESSAGE_LOG_LEVELS = [
        { message: 'A simple log with something random <random> in the middle', level: 'info' },
        { message: 'Yet another debug log', level: 'debug' },
        { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
      ];

      const logsWithTraces = range
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
                .create()
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(serviceNames[0])
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER.clusterName,
                  'orchestrator.cluster.id': CLUSTER.clusterId,
                  'orchestrator.namespace': CLUSTER.namespace,
                  'container.name': `${serviceNames[0]}-${generateShortId()}`,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': 'gcp',
                  'cloud.region': 'eu-central-1',
                  'cloud.availability_zone': 'eu-central-1a',
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                })
                .timestamp(timestamp);
            });
        });

      const logsOnly = range
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
                .create()
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service('synth-java')
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER.clusterName,
                  'orchestrator.cluster.id': CLUSTER.clusterId,
                  'orchestrator.namespace': CLUSTER.namespace,
                  'container.name': `synth-java-${generateShortId()}`,
                  'orchestrator.resource.id': generateShortId(),
                  'cloud.provider': 'gcp',
                  'cloud.region': 'eu-central-1',
                  'cloud.availability_zone': 'eu-central-1a',
                  'cloud.project.id': generateShortId(),
                  'cloud.instance.id': generateShortId(),
                  'log.file.path': `/logs/${generateLongId()}/error.txt`,
                })
                .timestamp(timestamp);
            });
        });

      function* createGeneratorFromArray(arr: Array<Serializable<any>>) {
        yield* arr;
      }

      const logsValuesArray = [...logsWithTraces, ...logsOnly];
      const logsGen = createGeneratorFromArray(logsValuesArray);
      const logsGenAssets = createGeneratorFromArray(logsValuesArray);

      const traces = instances.flatMap((instance) => instanceSpans(instance));
      const tracesGen = createGeneratorFromArray(traces);
      const tracesGenAssets = createGeneratorFromArray(traces);

      return [
        withClient(
          assetsEsClient,
          logger.perf('generating_assets_events', () =>
            Readable.from(Array.from(logsGenAssets).concat(Array.from(tracesGenAssets)))
          )
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logsGen)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => tracesGen)
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_infra_hosts', () => hosts)
        ),
      ];
    },
  };
};

export default scenario;
