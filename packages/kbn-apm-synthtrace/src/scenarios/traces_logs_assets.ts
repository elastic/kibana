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
  log,
  LogDocument,
  SynthtraceGenerator,
} from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    generate: ({ range, clients: { apmEsClient, assetsEsClient, logsEsClient } }) => {
      const serviceName = 'my-service';
      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.interval('1m').rate(1);
      const failedTimestamps = range.interval('1m').rate(1);

      const instance = apm
        .service({
          name: serviceName,
          environment: ENVIRONMENT,
          agentName: 'nodejs',
        })
        .instance('instance');

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

      // const failedTraceEvents = failedTimestamps.generator((timestamp) =>
      //   instance
      //     .transaction({ transactionName })
      //     .timestamp(timestamp)
      //     .duration(1000)
      //     .failure()
      //     .errors(
      //       instance
      //         .error({
      //           message: '[ResponseError] index_not_found_exception',
      //           type: 'ResponseError',
      //         })
      //         .timestamp(timestamp + 50)
      //     )
      // );

      // const metricsets = range
      //   .interval('30s')
      //   .rate(1)
      //   .generator((timestamp) =>
      //     instance
      //       .appMetrics({
      //         'system.memory.actual.free': 800,
      //         'system.memory.total': 1000,
      //         'system.cpu.total.norm.pct': 0.6,
      //         'system.process.cpu.total.norm.pct': 0.7,
      //       })
      //       .timestamp(timestamp)
      //   );

      // return [successfulTraceEvents];

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const { message, level } = {
                message: 'A simple log with something random <random> in the middle',
                level: 'info',
              };
              const CLUSTER = {
                clusterId: generateShortId(),
                clusterName: 'synth-cluster-2',
                namespace: 'production',
              };

              return log
                .create()
                .message(message.replace('<random>', generateShortId()))
                .logLevel(level)
                .service(serviceName)
                .defaults({
                  'trace.id': generateShortId(),
                  'agent.name': 'nodejs',
                  'orchestrator.cluster.name': CLUSTER.clusterName,
                  'orchestrator.cluster.id': CLUSTER.clusterId,
                  'orchestrator.namespace': CLUSTER.namespace,
                  'container.name': `${serviceName}-${generateShortId()}`,
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

      function* createGeneratorFromArray(arr: any[]) {
        yield* arr;
      }

      const logsValuesArray = [...logs];
      // Create new generators based on the values array
      const logsGen = createGeneratorFromArray(logsValuesArray);
      const logsGenAssets = createGeneratorFromArray(logsValuesArray);

      const tracesValuesArray = [...successfulTraceEvents];
      const tracesGen = createGeneratorFromArray(tracesValuesArray);
      const tracesGenAssets = createGeneratorFromArray(tracesValuesArray);

      return [
        withClient(
          assetsEsClient,
          logger.perf('generating_assets_events', () => [logsGenAssets, tracesGenAssets])
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logsGen)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () => tracesGen)
        ),
      ];
    },
  };
};

export default scenario;
