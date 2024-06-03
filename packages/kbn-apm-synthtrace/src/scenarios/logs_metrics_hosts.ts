/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  log,
  LogDocument,
  InfraDocument,
  apm,
  Instance,
  infra,
  ApmFields,
  generateShortId,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<LogDocument | InfraDocument | ApmFields> = async (runOptions) => {
  return {
    generate: ({ range, clients: { logsEsClient, infraEsClient, apmEsClient } }) => {
      const {
        numSpaces = 1,
        numServices = 10,
        numHosts = 10,
        numAgents = 5,
        numDatasets = 6,
        degradedRatio = 0.25, // Percentage of logs that are malformed (over limit or mapping conflict)
        numCustomFields = 50, // Number of custom field (e.g. `log.custom.field-1: "abc"`) per document
        logsInterval = '1m',
        logsRate = 10,
      } = runOptions.scenarioOpts || {};
      const { logger } = runOptions;

      // Hosts
      const infraHosts = Array(numHosts)
        .fill(0)
        .map((_, idx) => infra.host(getRotatedItem(idx, HOSTS, numHosts)));

      const hosts = range
        .interval('1m')
        .rate(10)
        .generator((timestamp) =>
          infraHosts.flatMap((host) => [
            host.cpu().timestamp(timestamp),
            host.memory().timestamp(timestamp),
            host.network().timestamp(timestamp),
            host.load().timestamp(timestamp),
            host.filesystem().timestamp(timestamp),
            host.diskio().timestamp(timestamp),
          ])
        );

      // Metrics
      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({
            name: getRotatedItem(index, SERVICE_NAMES, numServices),
            environment: ENVIRONMENT,
            agentName: getRotatedItem(index, AGENT_NAMES, numAgents),
          })
          .instance(getRotatedItem(index, HOSTS, numHosts))
      );
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = range
          .interval('20s')
          .rate(20)
          .generator((timestamp) => {
            const isError = Math.random() < 0.5;
            const cloudRegion = getRotatedItem(timestamp, CLOUD_REGION, 3);

            const transaction = instance
              .transaction({ transactionName: getRotatedItem(timestamp, TRANSACTION_NAMES, 3) })
              .timestamp(timestamp)
              .duration(1000)
              .defaults({
                'trace.id': `trace-id-${getTimestampBlock(timestamp, 3 * 60 * 1000)}`,
                'transaction.id': `transaction-id-${getTimestampBlock(timestamp, 60 * 1000)}`,
                'span.id': `span-id-${getTimestampBlock(timestamp, 30 * 1000)}`,
                'agent.name': getRotatedItem(timestamp, AGENT_NAMES, numAgents),
                'cloud.region': cloudRegion,
                'cloud.provider': getRotatedItem(timestamp, CLOUD_PROVIDERS, 3),
                'cloud.project.id': generateShortId(),
                'cloud.availability_zone': `${cloudRegion}a`,
                'service.name': getRotatedItem(timestamp, SERVICE_NAMES, numServices),
                'service.environment': ENVIRONMENT,
              });

            if (isError) {
              transaction.failure().errors(
                instance
                  .error({
                    message: '[ResponseError] index_not_found_exception',
                    type: 'ResponseError',
                  })
                  .timestamp(timestamp)
              );
            } else {
              transaction.success().children(
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
              );
            }

            return transaction;
          });

        const metricSets = range
          .interval('1m')
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
              .defaults({
                'host.name': getRotatedItem(timestamp, HOSTS, numHosts),
                'agent.name': getRotatedItem(timestamp, AGENT_NAMES, numAgents),
                'service.name': getRotatedItem(timestamp, SERVICE_NAMES, numServices),
              })
          );

        return [successfulTraceEvents, metricSets];
      };

      // Logs
      const cloudProjectId = `cloud-project-${generateShortId()}`;
      const logs = range
        .interval(logsInterval)
        .rate(logsRate)
        .generator((timestamp, index) => {
          const isMalformed = index > 0 && Math.random() < degradedRatio; // `index > 0` to wait for dynamic templates
          const cloudRegion = getRotatedItem(timestamp, CLOUD_REGION, 3);
          const dataset = getRotatedItem(timestamp, DATASETS, numDatasets);
          const space = getRotatedItem(timestamp, NAMESPACES, numSpaces);
          const hostName = getRotatedItem(timestamp, HOSTS, numHosts);
          const service = getRotatedItem(timestamp, SERVICE_NAMES, numServices);
          const logLevel = getRotatedItem(timestamp, LOG_LEVELS, LOG_LEVELS.length);
          const message = `Log message for logs-${dataset}-${space}. logLevel: ${logLevel}. isMalformed: ${isMalformed}. dataset: ${dataset}. space: ${space}. cloudRegion: ${cloudRegion}.`;
          const extraFields = getExtraFields(numCustomFields, isMalformed);

          return log
            .create()
            .dataset(dataset)
            .message(message)
            .logLevel(logLevel)
            .namespace(space)
            .hostName(hostName)
            .service(service)
            .containerId(`container.${Math.random() > 0.5 ? 1 : 2}.${hostName}`)
            .defaults({
              'trace.id': `trace-id-${getTimestampBlock(timestamp, 3 * 60 * 1000)}`,
              'transaction.id': `transaction-id-${getTimestampBlock(timestamp, 60 * 1000)}`,
              'agent.name': getRotatedItem(timestamp, AGENT_NAMES, numAgents),
              'container.id': generateShortId(),
              'orchestrator.cluster.name': getRotatedItem(timestamp, CLUSTERS, 3).clusterName,
              'orchestrator.cluster.id': getRotatedItem(timestamp, CLUSTERS, 3).clusterId,
              'orchestrator.resource.id': generateShortId(),
              'kubernetes.pod.uid': `kb.${Math.random() > 0.5 ? 1 : 2}.${hostName}`,
              'aws.s3.bucket.name': `aws.bk.${Math.random() > 0.5 ? 1 : 2}.${hostName}`,
              'cloud.provider': getRotatedItem(timestamp, CLOUD_PROVIDERS, 3),
              'cloud.region': cloudRegion,
              'cloud.availability_zone': `${cloudRegion}a`,
              'cloud.project.id': cloudProjectId,
              'cloud.instance.id': getRotatedItem(timestamp, CLUSTERS, 3).clusterId,
              'log.file.path': `/logs/${generateShortId()}/${logLevel}.txt`,
              'log.custom': extraFields,
            })
            .timestamp(timestamp);
        });

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_infra_hosts', () => hosts)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_apm_events', () =>
            instances.flatMap((instance) => instanceSpans(instance))
          )
        ),
        withClient(
          logsEsClient,
          logger.perf('generating_logs', () => logs)
        ),
      ];
    },
  };
};

export default scenario;

/**
 * The function will pick an item from the list of items and rotate the item based on the index and maxPickCount.
 *
 * @param index Current running index of the item. Can be any sequential number.
 * @param items List of items to pick from.
 * @param maxPickCount How many items to pick from the list. If maxPickCount > items.length, then it will pick all items.
 */
function getRotatedItem<T>(index: number, items: T[], maxPickCount: number) {
  const maxLength = Math.min(maxPickCount, items.length);
  return items[index % maxLength];
}

/**
 * The function will return the (passed) timestamp block based on the milliInterval.
 *
 * @param timestamp The timestamp to get the block for.
 * @param milliInterval The interval in milliseconds. E.g. 30000 for 30 second block.
 */
function getTimestampBlock(timestamp: number, milliInterval: number) {
  const remainder = timestamp % milliInterval;
  return timestamp - remainder;
}

/**
 * Generate extra fields with sequential keys (0 - n) to simulate extra/custom log fields in a log document.
 *
 * @param numFields Number of fields to generate.
 * @param isDegraded If true, will generate fields with more than 1024 characters, and will use a mix of numeric and
 * string values to cause mapping conflicts. If false, will generate first half with numeric values and second half with
 * string values.
 */
function getExtraFields(numFields: number, isDegraded = false) {
  const extraFields: Record<string, unknown> = {};
  for (let i = 0; i < numFields; i++) {
    if (isDegraded) {
      extraFields[`field-${i}`] = getRandomSlice(MORE_THAN_1024_CHARS, MORE_THAN_1024_CHARS.length);
    } else {
      if (i % 2 === 0) {
        extraFields[`field-${i}`] = Math.random() * 1000 * 1000; // Assign half of the fields with numeric values
      } else {
        extraFields[`field-${i}`] = getRandomSlice(MORE_THAN_1024_CHARS, 200);
      }
    }
  }
  return extraFields;
}

/**
 * Slices a string from the start index to a random number until length.
 */
function getRandomSlice(str: string, maxLength: number, startIndex = 0) {
  const start = Math.min(str.length, startIndex);
  const end = Math.min(str.length, start + Math.floor(Math.random() * maxLength));
  return str.slice(start, end);
}

const NAMESPACES = ['default', 'space-01', 'space-02', 'space-03'];

const SERVICE_NAMES = [
  'synth-java',
  'synth-dotnet',
  'frontend-rum',
  'azure-functions',
  'frontend',
  'checkout-service',
  'synth-go',
  'synth-node',
  'productcatalogservice',
  'synth-rum',
  'auditbeat',
  'synth-node-0',
  'payment-service',
  'opbeans-java-otel',
  'packetbeat',
  'cartservice',
  'web-go-0',
  'aws-lambdas',
  'opbeans-go',
  'synth-service-0',
  'synth-service-1',
  'order-processing-dotnet-1',
  'synth-java-0',
  'arn:aws:lambda:us-west-2:001:function:fn-node-2',
  'opbeans-ruby',
  'synth-android',
  'currencyservice',
  'opbeans-python',
  'synth-ios',
  'shippingservice',
  'adservice',
  'recommendationservice',
  'frauddetectionservice',
  'paymentservice',
  'checkoutservice',
  'emailservice',
  'quoteservice',
];

const HOSTS = [
  'apache-integrations-557cfb8fcb-6kb65',
  'mysql-integrations-6b69cc89b4-fzhvw',
  'docker-integrations-6cf69b8966-mnccd',
  'siem-linux-edge-lite-oblt',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-wrzm',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-vvnh',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-tc5h',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-rc92',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-mlgl',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-l7r5',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-js5d',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-f4q6',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-ddlj',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-d18l',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-9m5v',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-7jvw',
  'gke-edge-lite-oblt-edge-lite-oblt-poo-0d6e31aa-475z',
];

const CLUSTERS = [
  { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
];
const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];
const AGENT_NAMES = [
  'synth-agent',
  'opbeans-java',
  'opbeans-node',
  'opbeans-python',
  'opbeans-ruby',
];

const TRANSACTION_NAMES = ['GET /synth/customers', 'GET /synth/orders', 'GET /synth/articles'];

const DATASETS = [
  'apache.access',
  'apache.error',
  'nginx.access',
  'nginx.error',
  'apm.access',
  'apm.error',
  'apm.metrics',
  'apm.logs',
  'apm.traces',
  'apm.rum',
  'apm.profiling',
  'apm.uptime',
  'apm.synthetics',
  'apm.infra',
  'apm.sourcemap',
  'apm.span',
  'apm.transaction',
  'synth.1',
  'synth.2',
  'synth.3',
];

const LOG_LEVELS = ['info', 'error', 'warn', 'debug', 'trace'];

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';
