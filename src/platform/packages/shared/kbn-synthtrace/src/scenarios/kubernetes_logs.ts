/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { generateLongId, generateShortId, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import {
  getAgentName,
  getCloudProvider,
  getCloudRegion,
  getCluster,
  getGeoCoordinate,
  getIpAddress,
  getKubernetesMessages,
  KUBERNETES_SERVICES,
} from './helpers/logs_mock_data';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

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

// Generate realistic Kubernetes log messages
const generateKubernetesLogMessage = (serviceName: string) => {
  const kubernetesMessages = getKubernetesMessages();
  const serviceMessages = kubernetesMessages[serviceName] || kubernetesMessages['auth-service'];
  return serviceMessages[Math.floor(Math.random() * serviceMessages.length)];
};

const generatePodName = (serviceName: string) => {
  return `${serviceName}-${generateShortId()}-${generateShortId().substring(0, 5)}`;
};

const generateContainerName = (serviceName: string) => {
  return serviceName;
};

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);

  const constructKubernetesLogsData = () => {
    const serviceIndex = Math.floor(Math.random() * KUBERNETES_SERVICES.length);
    const serviceName = KUBERNETES_SERVICES[serviceIndex];
    const logLevelIndex = Math.floor(Math.random() * K8S_LOG_LEVELS.length);
    const logEntry = K8S_LOG_LEVELS[logLevelIndex];
    const { clusterId, clusterName, namespace } = getCluster();
    const cloudRegion = getCloudRegion();
    const resourceType = K8S_RESOURCE_TYPES[Math.floor(Math.random() * K8S_RESOURCE_TYPES.length)];
    const kubernetesNamespace = K8S_NAMESPACES[Math.floor(Math.random() * K8S_NAMESPACES.length)];
    const nodeName = K8S_NODE_NAMES[Math.floor(Math.random() * K8S_NODE_NAMES.length)];
    const containerState =
      K8S_CONTAINER_STATES[Math.floor(Math.random() * K8S_CONTAINER_STATES.length)];
    const containerImage =
      K8S_CONTAINER_IMAGES[Math.floor(Math.random() * K8S_CONTAINER_IMAGES.length)];
    const podName = generatePodName(serviceName);
    const containerName = generateContainerName(serviceName);

    const commonKubernetesFields: LogDocument = {
      'trace.id': generateLongId(),
      'agent.name': getAgentName(),

      // Orchestrator fields (ECS standard)
      'orchestrator.type': 'kubernetes',
      'orchestrator.cluster.name': clusterName,
      'orchestrator.cluster.id': clusterId,
      'orchestrator.namespace': kubernetesNamespace,
      'orchestrator.resource.name': podName,
      'orchestrator.resource.type': resourceType,
      'orchestrator.resource.id': generateLongId(),

      // Container fields
      'container.name': containerName,
      'container.id': generateLongId(),
      'container.image.name': containerImage,
      'container.image.tag': containerImage.split(':')[1] || 'latest',
      'container.runtime': 'containerd',

      // Host/Node fields
      'host.name': nodeName,
      'host.ip': getIpAddress(),
      'host.os.platform': 'linux',
      'host.os.name': 'Ubuntu',
      'host.os.version': '20.04.6 LTS',
      'host.architecture': 'x86_64',

      // Cloud fields
      'cloud.provider': getCloudProvider(),
      'cloud.region': cloudRegion,
      'cloud.availability_zone': `${cloudRegion}a`,
      'cloud.project.id': generateShortId(),
      'cloud.instance.id': generateShortId(),
      'cloud.instance.name': nodeName,

      // Service fields
      'service.name': serviceName,
      'service.version': '1.0.0',
      'service.environment': namespace === 'production' ? 'production' : 'development',

      // Process fields
      'process.pid': Math.floor(Math.random() * 32768) + 1,

      // File path (Kubernetes log file location)
      'log.file.path': `/var/log/pods/${kubernetesNamespace}_${podName}_${generateLongId()}/${containerName}/0.log`,

      // Additional Kubernetes metadata
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

  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    teardown: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.deleteIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      // Standard Kubernetes application logs
      const kubernetesAppLogs = range
        .interval('30s')
        .rate(2)
        .generator((timestamp) => {
          return Array(5)
            .fill(0)
            .map(() => {
              const {
                serviceName,
                logEntry: { level, message },
                commonKubernetesFields,
              } = constructKubernetesLogsData();

              const kubernetesLogMessage = generateKubernetesLogMessage(serviceName);

              return log
                .create({ isLogsDb })
                .message(`${message}: ${kubernetesLogMessage}`)
                .logLevel(level)
                .dataset('kubernetes.container_logs')
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults(commonKubernetesFields)
                .timestamp(timestamp);
            });
        });

      // Kubernetes system logs (kube-system namespace)
      const kubernetesSystemLogs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(3)
            .fill(0)
            .map(() => {
              const {
                logEntry: { level, message },
                commonKubernetesFields,
              } = constructKubernetesLogsData();

              const systemMessages = [
                'kubelet: Node condition is now: Ready',
                'kube-proxy: Successfully loaded kube-proxy configuration',
                'coredns: Plugin metrics is loaded',
                'etcd: Database compaction completed',
                'kube-apiserver: Request completed successfully',
                'kube-scheduler: Pod scheduled successfully',
                'kube-controller-manager: Deployment scaled successfully',
              ];

              const systemMessage =
                systemMessages[Math.floor(Math.random() * systemMessages.length)];

              return log
                .create({ isLogsDb })
                .message(`${message}: ${systemMessage}`)
                .logLevel(level)
                .dataset('kubernetes.system')
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonKubernetesFields,
                  'orchestrator.namespace': 'kube-system',
                  'kubernetes.namespace': 'kube-system',
                  'service.name': 'kubernetes-system',
                })
                .timestamp(timestamp);
            });
        });

      // Kubernetes container lifecycle logs
      const kubernetesLifecycleLogs = range
        .interval('2m')
        .rate(1)
        .generator((timestamp) => {
          return Array(2)
            .fill(0)
            .map(() => {
              const { commonKubernetesFields, podName, containerName } =
                constructKubernetesLogsData();

              const lifecycleEvents = [
                `Container ${containerName} in pod ${podName} started`,
                `Container ${containerName} in pod ${podName} stopped`,
                `Pod ${podName} scheduled to node ${commonKubernetesFields['host.name']}`,
                `Volume mounted for pod ${podName}`,
                `Health check passed for container ${containerName}`,
                `Readiness probe succeeded for container ${containerName}`,
                `Liveness probe failed for container ${containerName}`,
              ];

              const lifecycleMessage =
                lifecycleEvents[Math.floor(Math.random() * lifecycleEvents.length)];
              const isError =
                lifecycleMessage.includes('failed') || lifecycleMessage.includes('stopped');

              return log
                .create({ isLogsDb })
                .message(lifecycleMessage)
                .logLevel(isError ? 'error' : 'info')
                .dataset('kubernetes.container_logs')
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonKubernetesFields,
                  'event.category': 'container',
                  'event.type': isError ? 'error' : 'info',
                })
                .timestamp(timestamp);
            });
        });

      // Kubernetes ingress/networking logs
      const kubernetesNetworkingLogs = range
        .interval('45s')
        .rate(1)
        .generator((timestamp) => {
          return Array(2)
            .fill(0)
            .map(() => {
              const { serviceName, commonKubernetesFields } = constructKubernetesLogsData();

              const networkingMessages = [
                `Ingress controller: Route updated for ${serviceName}`,
                `Service mesh: Traffic routed to ${serviceName}`,
                `Load balancer: Health check passed for ${serviceName}`,
                `DNS resolution successful for ${serviceName}.default.svc.cluster.local`,
                `Network policy applied to ${serviceName}`,
                `Certificate rotation completed for ${serviceName}`,
              ];

              const networkingMessage =
                networkingMessages[Math.floor(Math.random() * networkingMessages.length)];

              return log
                .create({ isLogsDb })
                .message(networkingMessage)
                .logLevel('info')
                .dataset('kubernetes.networking')
                .setGeoLocation(getGeoCoordinate())
                .setHostIp(getIpAddress())
                .defaults({
                  ...commonKubernetesFields,
                  'service.name': 'ingress-nginx',
                  'kubernetes.namespace': 'ingress-nginx',
                  'orchestrator.namespace': 'ingress-nginx',
                })
                .timestamp(timestamp);
            });
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_kubernetes_logs', () => [
          kubernetesAppLogs,
          kubernetesSystemLogs,
          kubernetesLifecycleLogs,
          kubernetesNetworkingLogs,
        ])
      );
    },
  };
};

export default scenario;
