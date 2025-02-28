/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ApmFields,
  InfraDocument,
  Instance,
  LogDocument,
  apm,
  generateShortId,
  infra,
  log,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { Logger } from '../lib/utils/create_logger';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { MORE_THAN_1024_CHARS } from './helpers/logs_mock_data';
import { parseLogsScenarioOpts, parseStringToBoolean } from './helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// Use e.g. # ... --scenarioOpts.numServices=5 --scenarioOpts.customFieldPrefix="metric". See https://github.com/elastic/kibana/pull/184804 for more details.
const DEFAULT_SCENARIO_OPTS = {
  numSpaces: 1,
  numServices: 10,
  numHosts: 10,
  numAgents: 5,
  numDatasets: 6, // Won't be used if `datasets` option is provided
  datasets: undefined, // Provide a list of datasets --scenarioOpts.datasets="apache.access" --scenarioOpts.datasets="nginx.error" to override the default list
  degradedRatio: 0.25, // Percentage of logs that are malformed (over limit or mapping conflict)
  numCustomFields: 50, // Number of custom field (e.g. `log.custom.field-1: "abc"`) per document
  customFieldPrefix: 'field', // Prefix for custom fields (e.g. `log.custom.field-1: "abc"`)
  logsInterval: '1m',
  logsRate: 1,
  ingestHosts: true,
  ingestTraces: true,
  logsdb: false,
};

const scenario: Scenario<LogDocument | InfraDocument | ApmFields> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient, infraEsClient, apmEsClient } }) => {
      const {
        numSpaces,
        numServices,
        numHosts,
        numAgents,
        numDatasets,
        datasets,
        degradedRatio,
        numCustomFields,
        customFieldPrefix,
        logsInterval,
        logsRate,
        ingestHosts,
        ingestTraces,
      } = { ...DEFAULT_SCENARIO_OPTS, ...(runOptions.scenarioOpts || {}) };

      const parsedIngestHosts = parseStringToBoolean(`${ingestHosts}`);
      const parsedIngestTraces = parseStringToBoolean(`${ingestTraces}`);

      const { logger } = runOptions;

      killIfUnknownScenarioOptions(logger, runOptions.scenarioOpts || {});

      // Infra Hosts
      const infraHosts = Array(numHosts)
        .fill(0)
        .map((_, idx) => infra.host(getRotatedItem(idx, HOSTS, numHosts)));

      const hosts = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          const agent = getRotatedItem(timestamp, AGENTS, numAgents);
          const service = getRotatedItem(timestamp, SERVICE_NAMES, numServices);

          return infraHosts.flatMap((host) =>
            [
              host.cpu().timestamp(timestamp),
              host.memory().timestamp(timestamp),
              host.network().timestamp(timestamp),
              host.load().timestamp(timestamp),
              host.filesystem().timestamp(timestamp),
              host.diskio().timestamp(timestamp),
            ].map((metric) =>
              metric.defaults({
                'host.name': host.fields['host.name'],
                'host.hostname': host.fields['host.name'],
                'agent.id': agent.id,
                'service.name': service,
                'system.memory.actual.free': 500 + Math.floor(Math.random() * 500),
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.5 + Math.random() * 0.25,
              })
            )
          );
        });

      // APM Traces
      const instances = [...Array(numServices).keys()].map((index) => {
        const agent = getRotatedItem(index, AGENTS, numAgents);

        return apm
          .service({
            name: getRotatedItem(index, SERVICE_NAMES, numServices),
            environment: ENVIRONMENT,
            agentName: agent.name,
          })
          .instance(getRotatedItem(index, HOSTS, numHosts));
      });
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = range
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isError = Math.random() < 0.5;
            const cloudRegion = getRotatedItem(timestamp, CLOUD_REGION, 3);
            const agent = getRotatedItem(timestamp, AGENTS, numAgents);

            const transaction = instance
              .transaction({ transactionName: getRotatedItem(timestamp, TRANSACTION_NAMES, 3) })
              .timestamp(timestamp)
              .duration(1000)
              .defaults({
                'trace.id': `trace-id-${getTimestampBlock(timestamp, 3 * 60 * 1000)}`,
                'transaction.id': `transaction-id-${getTimestampBlock(timestamp, 2 * 60 * 1000)}`,
                'span.id': `span-id-${getTimestampBlock(timestamp, 60 * 1000)}`,
                'agent.name': agent.name,
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

        return [successfulTraceEvents];
      };

      // Logs
      const logDatasets = datasets ? (Array.isArray(datasets) ? datasets : [datasets]) : DATASETS;
      const numLogDatasets = datasets ? logDatasets.length : numDatasets;
      const cloudProjectId = `cloud-project-${generateShortId()}`;
      const logs = range
        .interval(logsInterval)
        .rate(logsRate)
        .generator((timestamp, index) => {
          const isMalformed = index > 0 && Math.random() < degradedRatio; // `index > 0` to wait for dynamic templates
          const cloudRegion = getRotatedItem(timestamp, CLOUD_REGION, 3);
          const dataset = getRotatedItem(timestamp, logDatasets, numLogDatasets);
          const space = getRotatedItem(timestamp, NAMESPACES, numSpaces);
          const hostName = getRotatedItem(timestamp, HOSTS, numHosts);
          const agent = getRotatedItem(timestamp, AGENTS, numAgents);
          const service = getRotatedItem(timestamp, SERVICE_NAMES, numServices);
          const logLevel = getRotatedItem(timestamp, LOG_LEVELS, LOG_LEVELS.length);
          const message = `Log message for logs-${dataset}-${space}. logLevel: ${logLevel}. isMalformed: ${isMalformed}. dataset: ${dataset}. space: ${space}. cloudRegion: ${cloudRegion}.`;
          const customFields = getExtraFields(numCustomFields, isMalformed, customFieldPrefix);

          return log
            .create({ isLogsDb })
            .dataset(dataset)
            .message(message)
            .logLevel(logLevel)
            .namespace(space)
            .hostName(hostName)
            .service(service)
            .containerId(`container.${Math.random() > 0.5 ? 1 : 2}.${hostName}`)
            .defaults({
              'trace.id': `trace-id-${getTimestampBlock(timestamp, 3 * 60 * 1000)}`,
              'transaction.id': `transaction-id-${getTimestampBlock(timestamp, 2 * 60 * 1000)}`,
              'agent.id': agent.id,
              'agent.name': agent.name,
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
              'log.custom': customFields,
            })
            .timestamp(timestamp);
        });

      return [
        ...(parsedIngestHosts
          ? [
              withClient(
                infraEsClient,
                logger.perf('generating_infra_hosts', () => hosts)
              ),
            ]
          : []),
        ...(parsedIngestTraces
          ? [
              withClient(
                apmEsClient,
                logger.perf('generating_apm_events', () =>
                  instances.flatMap((instance) => instanceSpans(instance))
                )
              ),
            ]
          : []),
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
  const normalizedIndex = Math.floor(index > 1000000 ? index / 1000 : index); // To randomize timestamps
  const maxLength = Math.min(maxPickCount, items.length);
  return items[normalizedIndex % maxLength];
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
 * @param customFieldPrefix Prefix for the field key. Default is 'field'.
 */
function getExtraFields(
  numFields: number,
  isDegraded = false,
  customFieldPrefix = DEFAULT_SCENARIO_OPTS.customFieldPrefix
) {
  const extraFields: Record<string, unknown> = {};
  for (let i = 0; i < numFields; i++) {
    if (isDegraded) {
      extraFields[`${customFieldPrefix}-${i}`] = getRandomSlice(
        MORE_THAN_1024_CHARS,
        MORE_THAN_1024_CHARS.length
      );
    } else {
      if (i % 2 === 0) {
        extraFields[`${customFieldPrefix}-${i}`] = Math.random() * 1000 * 1000; // Assign half of the fields with numeric values
      } else {
        extraFields[`${customFieldPrefix}-${i}`] = getRandomSlice(MORE_THAN_1024_CHARS, 200);
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

function killIfUnknownScenarioOptions(logger: Logger, options: Record<string, unknown>) {
  const unknownOptions = Object.keys(options).filter(
    (key) => !Object.keys(DEFAULT_SCENARIO_OPTS).includes(key)
  );
  if (unknownOptions.length > 0) {
    logger.error(`Unknown scenario option(s): ${unknownOptions.join(', ')}`);
    process.exit(1);
  }
}

const NAMESPACES = ['default', 'space-01', 'space-02', 'space-03'];

const SERVICE_NAMES = [
  'frontend-rum',
  'azure-functions',
  'frontend',
  'checkout-service',
  'synth-go',
  'synth-node',
  'synth-dotnet',
  'synth-java',
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
const AGENTS = [
  { id: 'go-id', name: 'go' },
  { id: 'rum-js-id', name: 'rum-js' },
  { id: 'nodejs-id', name: 'nodejs' },
  { id: 'opbeans-java-id', name: 'opbeans-java' },
  { id: 'opbeans-node-id', name: 'opbeans-node' },
  { id: 'opbeans-python-id', name: 'opbeans-python' },
  { id: 'opbeans-ruby-id', name: 'opbeans-ruby' },
  { id: 'opbeans-dotnet-id', name: 'opbeans-dotnet' },
  { id: 'synth-agent-id', name: 'synth-agent' },
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
  'mysql.access',
  'mysql.error',
  'kubernetes.audit_logs',
  'kubernetes.container_logs',
  'system.syslog',
  'postgresql.error',
  'postgresql.log',
  'redis.error',
  'redis.log',
  'mongodb.error',
  'mongodb.log',
  'activemq.audit',
  'activemq.log',
  'elasticsearch.audit',
  'elasticsearch.slowlog',
  'akamai.siem',
  'auditd.log',
  'auditd_manager.auditd',
  'cloud_security_posture.findings',
  'docker.container_logs',
  'elastic_agent.apm_server',
  'elastic_agent.filebeat',
  'elastic_agent.heartbeat',
  'fleet_server.output_health',
  'fleet_server.logs',
  'kibana.audit',
  'kibana.log',
  'microsoft_sqlserver.audit',
  'microsoft_sqlserver.log',
  'network_traffic.http',
  'network_traffic.dns',
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

const LOG_LEVELS = ['info', 'error', 'warn', 'debug'];
