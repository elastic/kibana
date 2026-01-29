/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CuratedMetricQuery } from '../types';

/**
 * Curated metrics for Kubernetes Pod entities
 */
export const K8S_POD_METRICS: CuratedMetricQuery[] = [
  {
    id: 'k8s_pod_cpu_otel',
    displayName: 'CPU Usage',
    description: 'Pod CPU utilization',
    dataSource: 'otel',
    requiredFields: ['k8s.pod.cpu.utilization'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'k8s.pod.cpu.utilization',
  },

  {
    id: 'k8s_pod_cpu_ecs',
    displayName: 'CPU Usage',
    description: 'Pod CPU utilization',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.pod.cpu.usage.node.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'kubernetes.pod.cpu.usage.node.pct',
  },

  {
    id: 'k8s_pod_memory_otel',
    displayName: 'Memory Usage',
    description: 'Pod memory usage',
    dataSource: 'otel',
    requiredFields: ['k8s.pod.memory.usage'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'k8s.pod.memory.usage',
  },

  {
    id: 'k8s_pod_memory_ecs',
    displayName: 'Memory Usage',
    description: 'Pod memory usage',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.pod.memory.usage.bytes'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'kubernetes.pod.memory.usage.bytes',
  },

  // Network - OTel (custom query: filter by direction)
  {
    id: 'k8s_pod_network_in_otel',
    displayName: 'Network In',
    description: 'Pod network bytes received per second',
    dataSource: 'otel',
    requiredFields: ['k8s.pod.network.io', 'direction'],
    unit: 'bytesPerSecond',
    query: `
      TS {{index}}
      | STATS _rate = SUM(RATE(k8s.pod.network.io)) BY {{entity}}, direction{{bucket}}
      | STATS rx = SUM(_rate) WHERE direction == "receive" BY {{entity}}{{timestamp}}
      | SORT {{sort}}
    `,
  },

  {
    id: 'k8s_pod_network_in_ecs',
    displayName: 'Network In',
    description: 'Pod network bytes received per second',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.pod.network.rx.bytes'],
    unit: 'bytesPerSecond',
    instrument: 'counter',
    field: 'kubernetes.pod.network.rx.bytes',
  },

  {
    id: 'k8s_pod_network_out_otel',
    displayName: 'Network Out',
    description: 'Pod network bytes transmitted per second',
    dataSource: 'otel',
    requiredFields: ['k8s.pod.network.io', 'direction'],
    unit: 'bytesPerSecond',
    query: `
      TS {{index}}
      | STATS _rate = SUM(RATE(k8s.pod.network.io)) BY {{entity}}, direction{{bucket}}
      | STATS tx = SUM(_rate) WHERE direction == "transmit" BY {{entity}}{{timestamp}}
      | SORT {{sort}}
    `,
  },

  {
    id: 'k8s_pod_network_out_ecs',
    displayName: 'Network Out',
    description: 'Pod network bytes transmitted per second',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.pod.network.tx.bytes'],
    unit: 'bytesPerSecond',
    instrument: 'counter',
    field: 'kubernetes.pod.network.tx.bytes',
  },
];

/**
 * Curated metrics for Kubernetes Node entities
 */
export const K8S_NODE_METRICS: CuratedMetricQuery[] = [
  {
    id: 'k8s_node_cpu_otel',
    displayName: 'CPU Usage',
    description: 'Node CPU utilization',
    dataSource: 'otel',
    requiredFields: ['k8s.node.cpu.utilization'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'k8s.node.cpu.utilization',
  },

  {
    id: 'k8s_node_cpu_ecs',
    displayName: 'CPU Usage',
    description: 'Node CPU utilization',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.node.cpu.usage.nanocores'],
    unit: 'count',
    instrument: 'gauge',
    field: 'kubernetes.node.cpu.usage.nanocores',
  },

  {
    id: 'k8s_node_memory_otel',
    displayName: 'Memory Usage',
    description: 'Node memory usage',
    dataSource: 'otel',
    requiredFields: ['k8s.node.memory.usage'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'k8s.node.memory.usage',
  },

  {
    id: 'k8s_node_memory_ecs',
    displayName: 'Memory Usage',
    description: 'Node memory usage',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.node.memory.usage.bytes'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'kubernetes.node.memory.usage.bytes',
  },

  {
    id: 'k8s_node_pods_otel',
    displayName: 'Running Pods',
    description: 'Number of running pods on the node',
    dataSource: 'otel',
    requiredFields: ['k8s.node.condition.ready'],
    unit: 'count',
    instrument: 'gauge',
    field: 'k8s.node.condition.ready',
  },
];

/**
 * Curated metrics for Kubernetes Container entities
 */
export const K8S_CONTAINER_METRICS: CuratedMetricQuery[] = [
  {
    id: 'k8s_container_cpu_otel',
    displayName: 'CPU Usage',
    description: 'Container CPU utilization',
    dataSource: 'otel',
    requiredFields: ['k8s.container.cpu.utilization'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'k8s.container.cpu.utilization',
  },

  {
    id: 'k8s_container_cpu_ecs',
    displayName: 'CPU Usage',
    description: 'Container CPU utilization',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.container.cpu.usage.nanocores'],
    unit: 'count',
    instrument: 'gauge',
    field: 'kubernetes.container.cpu.usage.nanocores',
  },

  {
    id: 'k8s_container_memory_otel',
    displayName: 'Memory Usage',
    description: 'Container memory usage',
    dataSource: 'otel',
    requiredFields: ['k8s.container.memory.usage'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'k8s.container.memory.usage',
  },

  {
    id: 'k8s_container_memory_ecs',
    displayName: 'Memory Usage',
    description: 'Container memory usage',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.container.memory.usage.bytes'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'kubernetes.container.memory.usage.bytes',
  },
];

/**
 * Curated metrics for Kubernetes Deployment entities
 */
export const K8S_DEPLOYMENT_METRICS: CuratedMetricQuery[] = [
  {
    id: 'k8s_deployment_replicas_available_otel',
    displayName: 'Available Replicas',
    description: 'Number of available replicas',
    dataSource: 'otel',
    requiredFields: ['k8s.deployment.available'],
    unit: 'count',
    instrument: 'gauge',
    field: 'k8s.deployment.available',
  },

  {
    id: 'k8s_deployment_replicas_available_ecs',
    displayName: 'Available Replicas',
    description: 'Number of available replicas',
    dataSource: 'ecs',
    requiredFields: ['kubernetes.deployment.replicas.available'],
    unit: 'count',
    instrument: 'gauge',
    field: 'kubernetes.deployment.replicas.available',
  },
];

/**
 * Curated metrics for Kubernetes Namespace entities
 */
export const K8S_NAMESPACE_METRICS: CuratedMetricQuery[] = [
  {
    id: 'k8s_namespace_pods_otel',
    displayName: 'Running Pods',
    description: 'Number of running pods in namespace',
    dataSource: 'otel',
    requiredFields: ['k8s.pod.name'],
    unit: 'count',
    query: `
      TS {{index}}
      | STATS pods = COUNT_DISTINCT(k8s.pod.name) BY {{entity}}{{bucket}}{{timestamp}}
      | SORT {{sort}}
    `,
  },
];
