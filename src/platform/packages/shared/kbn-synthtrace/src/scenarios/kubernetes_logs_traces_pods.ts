/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a comprehensive set of correlated Kubernetes logs, APM traces, and pod/container metrics.
 */

import type { ApmFields, InfraDocument, Instance, LogDocument } from '@kbn/synthtrace-client';
import { apm, generateLongId, generateShortId, infra, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import {
  getCloudProvider,
  getCloudRegion,
  getCluster,
  getGeoCoordinate,
  getIpAddress,
  getKubernetesMessages,
  KUBERNETES_SERVICES,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts, parseStringToBoolean } from './helpers/logs_scenario_opts_parser';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// Kubernetes-specific log levels and contexts
const K8S_LOG_LEVELS = [
  { message: 'Pod started successfully', level: 'info' },
  { message: 'Container image pulled', level: 'info' },
  { message: 'Volume mounted successfully', level: 'info' },
  { message: 'Service endpoint updated', level: 'info' },
  { message: 'Warning: Pod restart detected', level: 'warning' },
  { message: 'Warning: High memory usage detected', level: 'warning' },
  { message: 'Warning: Disk space running low', level: 'warning' },
  { message: 'Error: Failed to pull container image', level: 'error' },
  { message: 'Error: Pod failed to start', level: 'error' },
  { message: 'Error: Service unavailable', level: 'error' },
  { message: 'Critical: Node not ready', level: 'critical' },
  { message: 'Critical: Persistent volume claim failed', level: 'critical' },
];

const K8S_RESOURCE_TYPES = ['pod', 'service', 'deployment', 'configmap', 'secret', 'ingress'];

const K8S_NAMESPACES = [
  'default',
  'kube-system',
  'kube-public',
  'production',
  'staging',
  'development',
];

const K8S_NODE_NAMES = [
  'worker-node-01',
  'worker-node-02',
  'worker-node-03',
  'master-node-01',
  'master-node-02',
];

const K8S_CONTAINER_STATES = ['running', 'waiting', 'terminated'];

const K8S_CONTAINER_IMAGES = [
  'nginx:1.21-alpine',
  'redis:6.2-alpine',
  'postgres:13-alpine',
  'node:18-alpine',
  'python:3.9-slim',
  'openjdk:11-jre-slim',
];

const DEFAULT_SCENARIO_OPTS = {
  numServices: 10,
  numPods: 20,
  numContainers: 30,
  numAgents: 5,
  logsInterval: '1m',
  logsRate: 1,
  ingestPods: 'true',
  ingestContainers: 'true',
  ingestTraces: 'true',
  logsdb: 'false',
};

const generatePodName = (serviceName: string) => {
  return `${serviceName}-${generateShortId()}-${generateShortId().substring(0, 5)}`;
};

const generateContainerName = (serviceName: string) => {
  return serviceName;
};

const generateKubernetesLogMessage = (serviceName: string) => {
  const kubernetesMessages = getKubernetesMessages();
  const serviceMessages = kubernetesMessages[serviceName] || kubernetesMessages['auth-service'];
  return serviceMessages[Math.floor(Math.random() * serviceMessages.length)];
};

function getRotatedItem<T>(index: number, items: T[], maxPickCount: number) {
  const normalizedIndex = Math.floor(index > 1000000 ? index / 1000 : index);
  const maxLength = Math.min(maxPickCount, items.length);
  return items[normalizedIndex % maxLength];
}

function getTimestampBlock(timestamp: number, milliInterval: number) {
  const remainder = timestamp % milliInterval;
  return timestamp - remainder;
}

const scenario: Scenario<LogDocument | InfraDocument | ApmFields> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient, infraEsClient, apmEsClient } }) => {
      const {
        numServices,
        numPods,
        numContainers,
        numAgents,
        logsInterval,
        logsRate,
        ingestPods,
        ingestContainers,
        ingestTraces,
      } = { ...DEFAULT_SCENARIO_OPTS, ...(runOptions.scenarioOpts || {}) };

      const parsedIngestPods = parseStringToBoolean(ingestPods);
      const parsedIngestContainers = parseStringToBoolean(ingestContainers);
      const parsedIngestTraces = parseStringToBoolean(ingestTraces);

      const { logger } = runOptions;

      // Kubernetes Pods
      const pods = Array(numPods)
        .fill(0)
        .map((_, idx) => {
          const uid = generateShortId();
          const nodeName = getRotatedItem(idx, K8S_NODE_NAMES, K8S_NODE_NAMES.length);
          return infra.pod(uid, nodeName);
        });

      const podMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => pods.flatMap((pod) => [pod.metrics().timestamp(timestamp)]));

      // Kubernetes Containers
      const containers = Array(numContainers)
        .fill(0)
        .map((_, idx) => {
          const id = generateShortId();
          const podIdx = idx % numPods;
          const pod = pods[podIdx];
          const nodeName =
            pod.fields['kubernetes.node.name'] ||
            getRotatedItem(idx, K8S_NODE_NAMES, K8S_NODE_NAMES.length);
          return infra.k8sContainer(id, pod.fields['kubernetes.pod.uid'], nodeName);
        });

      const containerMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          containers.flatMap((container) => [container.metrics().timestamp(timestamp)])
        );

      // APM Traces for Kubernetes services
      const instances = [...Array(numServices).keys()].map((index) => {
        const agent = getRotatedItem(index, AGENTS, numAgents);
        const serviceName = getRotatedItem(index, KUBERNETES_SERVICES, numServices);

        return apm
          .service({
            name: serviceName,
            environment: ENVIRONMENT,
            agentName: agent.name,
          })
          .instance(getRotatedItem(index, K8S_NODE_NAMES, K8S_NODE_NAMES.length));
      });

      const instanceSpans = (instance: Instance) => {
        const traceEvents = range
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isError = Math.random() < 0.3;
            const cloudRegion = getRotatedItem(timestamp, CLOUD_REGION, 3);
            const agent = getRotatedItem(timestamp, AGENTS, numAgents);
            const podName = generatePodName(instance.fields['service.name'] || '');

            const transaction = instance
              .transaction({ transactionName: getRotatedItem(timestamp, TRANSACTION_NAMES, 3) })
              .timestamp(timestamp)
              .duration(1000)
              .defaults({
                'agent.name': agent.name,
                'cloud.region': cloudRegion,
                'cloud.provider': getRotatedItem(timestamp, CLOUD_PROVIDERS, 3),
                'cloud.project.id': generateShortId(),
                'cloud.availability_zone': `${cloudRegion}a`,
                'service.name': instance.fields['service.name'],
                'service.environment': ENVIRONMENT,
                'kubernetes.pod.name': podName,
                'kubernetes.pod.uid': generateLongId(),
                'kubernetes.namespace': getRotatedItem(
                  timestamp,
                  K8S_NAMESPACES,
                  K8S_NAMESPACES.length
                ),
              });

            if (isError) {
              transaction.failure().errors(
                instance
                  .error({
                    message: '[KubernetesError] Pod failed to start',
                    type: 'KubernetesError',
                  })
                  .timestamp(timestamp)
              );
            } else {
              transaction.success().children(
                instance
                  .span({
                    spanName: 'GET /api/v1/pods',
                    spanType: 'db',
                    spanSubtype: 'kubernetes',
                  })
                  .duration(500)
                  .success()
                  .timestamp(timestamp),
                instance
                  .span({ spanName: 'container_operation', spanType: 'custom' })
                  .duration(200)
                  .success()
                  .timestamp(timestamp)
              );
            }

            return transaction;
          });

        return [traceEvents];
      };

      // Kubernetes Logs
      const constructKubernetesLogsData = (timestamp: number) => {
        const serviceIndex = Math.floor(Math.random() * KUBERNETES_SERVICES.length);
        const serviceName = KUBERNETES_SERVICES[serviceIndex];
        const logLevelIndex = Math.floor(Math.random() * K8S_LOG_LEVELS.length);
        const logEntry = K8S_LOG_LEVELS[logLevelIndex];
        const { clusterId, clusterName, namespace } = getCluster();
        const cloudRegion = getCloudRegion();
        const resourceType = getRotatedItem(
          timestamp,
          K8S_RESOURCE_TYPES,
          K8S_RESOURCE_TYPES.length
        );
        const kubernetesNamespace = getRotatedItem(
          timestamp,
          K8S_NAMESPACES,
          K8S_NAMESPACES.length
        );
        const nodeName = getRotatedItem(timestamp, K8S_NODE_NAMES, K8S_NODE_NAMES.length);
        const containerState = getRotatedItem(
          timestamp,
          K8S_CONTAINER_STATES,
          K8S_CONTAINER_STATES.length
        );
        const containerImage = getRotatedItem(
          timestamp,
          K8S_CONTAINER_IMAGES,
          K8S_CONTAINER_IMAGES.length
        );
        const podName = generatePodName(serviceName);
        const containerName = generateContainerName(serviceName);

        const commonKubernetesFields: LogDocument = {
          'trace.id': `trace-id-${getTimestampBlock(timestamp, 3 * 60 * 1000)}`,
          'agent.name': getRotatedItem(
            timestamp,
            ['otlp', 'otlp/nodejs', 'otlp/go', 'opentelemetry/nodejs', 'opentelemetry/go'],
            5
          ),
          'orchestrator.type': 'kubernetes',
          'orchestrator.cluster.name': clusterName,
          'orchestrator.cluster.id': clusterId,
          'orchestrator.namespace': kubernetesNamespace,
          'orchestrator.resource.name': podName,
          'orchestrator.resource.type': resourceType,
          'orchestrator.resource.id': generateLongId(),
          'container.name': containerName,
          'container.id': generateLongId(),
          'container.image.name': containerImage,
          'container.image.tag': containerImage.split(':')[1] || 'latest',
          'container.runtime': 'containerd',
          'host.name': nodeName,
          'host.ip': getIpAddress(),
          'host.os.platform': 'linux',
          'host.os.name': 'Ubuntu',
          'host.os.version': '20.04.6 LTS',
          'host.architecture': 'x86_64',
          'cloud.provider': getCloudProvider(),
          'cloud.region': cloudRegion,
          'cloud.availability_zone': `${cloudRegion}a`,
          'cloud.project.id': generateShortId(),
          'cloud.instance.id': generateShortId(),
          'cloud.instance.name': nodeName,
          'service.name': serviceName,
          'service.version': '1.0.0',
          'service.environment': namespace === 'production' ? 'production' : 'development',
          'process.pid': Math.floor(Math.random() * 32768) + 1,
          'log.file.path': `/var/log/pods/${kubernetesNamespace}_${podName}_${generateLongId()}/${containerName}/0.log`,
          'kubernetes.pod.name': podName,
          'kubernetes.pod.uid': generateLongId(),
          'kubernetes.container.name': containerName,
          'kubernetes.container.image': containerImage,
          'kubernetes.container.image_id': `sha256:${generateLongId()}`,
          'kubernetes.namespace': kubernetesNamespace,
          'kubernetes.node.name': nodeName,
          'kubernetes.node.uid': generateLongId(),
          'kubernetes.labels.app': serviceName,
          'kubernetes.labels.version': 'v1.0',
          'kubernetes.labels.tier': containerState === 'running' ? 'backend' : 'frontend',
          'kubernetes.annotations.deployment': `${serviceName}-deployment`,
        };

        return {
          serviceName,
          logEntry,
          commonKubernetesFields,
          kubernetesNamespace,
          podName,
          containerName,
        };
      };

      const kubernetesLogs = range
        .interval(logsInterval)
        .rate(logsRate)
        .generator((timestamp) => {
          const {
            serviceName,
            logEntry: { level, message },
            commonKubernetesFields,
          } = constructKubernetesLogsData(timestamp);

          const kubernetesLogMessage = generateKubernetesLogMessage(serviceName);

          return log
            .create({ isLogsDb })
            .message(`${message}: ${kubernetesLogMessage}`)
            .logLevel(level)
            .dataset('kubernetes.container_logs')
            .setGeoLocation(getGeoCoordinate())
            .setHostIp(getIpAddress())
            .defaults({
              ...commonKubernetesFields,
              'trace.id': `trace-id-${getTimestampBlock(timestamp, 3 * 60 * 1000)}`,
              'transaction.id': `transaction-id-${getTimestampBlock(timestamp, 2 * 60 * 1000)}`,
            })
            .timestamp(timestamp);
        });

      return [
        ...(parsedIngestPods
          ? [
              withClient(
                infraEsClient,
                logger.perf('generating_infra_pods', () => podMetrics)
              ),
            ]
          : []),
        ...(parsedIngestContainers
          ? [
              withClient(
                infraEsClient,
                logger.perf('generating_infra_containers', () => containerMetrics)
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
          logger.perf('generating_kubernetes_logs', () => kubernetesLogs)
        ),
      ];
    },
  };
};

export default scenario;

const AGENTS = [
  { id: 'otlp-go-id', name: 'otlp/go' },
  { id: 'otlp-nodejs-id', name: 'otlp/nodejs' },
  { id: 'otlp-java-id', name: 'otlp/java' },
  { id: 'otlp-python-id', name: 'otlp/python' },
  { id: 'otlp-dotnet-id', name: 'otlp/dotnet' },
  { id: 'opentelemetry-go-id', name: 'opentelemetry/go' },
  { id: 'opentelemetry-nodejs-id', name: 'opentelemetry/nodejs' },
  { id: 'opentelemetry-java-id', name: 'opentelemetry/java' },
  { id: 'otlp-id', name: 'otlp' },
];

const TRANSACTION_NAMES = [
  'GET /api/v1/pods',
  'GET /api/v1/services',
  'GET /api/v1/deployments',
  'POST /api/v1/namespaces',
  'GET /api/v1/nodes',
];

const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'us-west-2'];
