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
 * Curated metrics for Host entities
 * Includes both OTel and ECS variants for each metric
 */
export const HOST_METRICS: CuratedMetricQuery[] = [
  // ==========================================================================
  // CPU Usage
  // ==========================================================================

  // CPU Usage - OTel (custom query: filter idle/wait states, compute 1 - sum)
  {
    id: 'cpu_usage_otel',
    displayName: 'CPU Usage',
    description: 'Overall CPU utilization excluding idle and wait states',
    dataSource: 'otel',
    requiredFields: ['system.cpu.utilization', 'attributes.state'],
    unit: 'percent',
    query: `
      TS {{index}}
      | STATS _idle = AVG(system.cpu.utilization) BY {{entity}}, attributes.state{{bucket}}
      | STATS utilization = 1 - SUM(_idle) WHERE attributes.state IN ("idle", "wait") BY {{entity}}{{timestamp}}
      | SORT {{sort}}
    `,
  },

  // CPU Usage - ECS/Elastic Agent (simple: just average the field)
  {
    id: 'cpu_usage_ecs',
    displayName: 'CPU Usage',
    description: 'Overall CPU utilization',
    dataSource: 'ecs',
    requiredFields: ['system.cpu.total.norm.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.cpu.total.norm.pct',
  },

  // ==========================================================================
  // Memory Usage
  // ==========================================================================

  {
    id: 'memory_usage_otel',
    displayName: 'Memory Usage',
    description: 'Memory utilization percentage',
    dataSource: 'otel',
    requiredFields: ['system.memory.utilization'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.memory.utilization',
  },

  {
    id: 'memory_usage_ecs',
    displayName: 'Memory Usage',
    description: 'Memory utilization percentage',
    dataSource: 'ecs',
    requiredFields: ['system.memory.actual.used.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.memory.actual.used.pct',
  },

  // ==========================================================================
  // Disk Usage
  // ==========================================================================

  {
    id: 'disk_usage_otel',
    displayName: 'Disk Usage',
    description: 'Filesystem utilization percentage',
    dataSource: 'otel',
    requiredFields: ['system.filesystem.utilization'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.filesystem.utilization',
  },

  {
    id: 'disk_usage_ecs',
    displayName: 'Disk Usage',
    description: 'Filesystem utilization percentage',
    dataSource: 'ecs',
    requiredFields: ['system.filesystem.used.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.filesystem.used.pct',
  },

  // ==========================================================================
  // Network I/O
  // ==========================================================================

  // Network Inbound - OTel (custom query: filter by direction)
  {
    id: 'network_in_otel',
    displayName: 'Network In',
    description: 'Network bytes received per second',
    dataSource: 'otel',
    requiredFields: ['system.network.io', 'direction'],
    unit: 'bytesPerSecond',
    query: `
      TS {{index}}
      | STATS _rate = SUM(RATE(system.network.io)) BY {{entity}}, direction{{bucket}}
      | STATS rx = SUM(_rate) WHERE direction == "receive" BY {{entity}}{{timestamp}}
      | SORT {{sort}}
    `,
  },

  // Network Inbound - ECS (simple counter)
  {
    id: 'network_in_ecs',
    displayName: 'Network In',
    description: 'Network bytes received per second',
    dataSource: 'ecs',
    requiredFields: ['system.network.in.bytes'],
    unit: 'bytesPerSecond',
    instrument: 'counter',
    field: 'system.network.in.bytes',
  },

  // Network Outbound - OTel (custom query: filter by direction)
  {
    id: 'network_out_otel',
    displayName: 'Network Out',
    description: 'Network bytes transmitted per second',
    dataSource: 'otel',
    requiredFields: ['system.network.io', 'direction'],
    unit: 'bytesPerSecond',
    query: `
      TS {{index}}
      | STATS _rate = SUM(RATE(system.network.io)) BY {{entity}}, direction{{bucket}}
      | STATS tx = SUM(_rate) WHERE direction == "transmit" BY {{entity}}{{timestamp}}
      | SORT {{sort}}
    `,
  },

  // Network Outbound - ECS (simple counter)
  {
    id: 'network_out_ecs',
    displayName: 'Network Out',
    description: 'Network bytes transmitted per second',
    dataSource: 'ecs',
    requiredFields: ['system.network.out.bytes'],
    unit: 'bytesPerSecond',
    instrument: 'counter',
    field: 'system.network.out.bytes',
  },

  // ==========================================================================
  // Load Average
  // ==========================================================================

  {
    id: 'load_average_ecs',
    displayName: 'Load Average (1m)',
    description: 'System load average over the last minute',
    dataSource: 'ecs',
    requiredFields: ['system.load.1'],
    unit: 'count',
    instrument: 'gauge',
    field: 'system.load.1',
  },
];

/**
 * Curated metrics for Container entities
 */
export const CONTAINER_METRICS: CuratedMetricQuery[] = [
  {
    id: 'container_cpu_otel',
    displayName: 'CPU Usage',
    description: 'Container CPU utilization',
    dataSource: 'otel',
    requiredFields: ['container.cpu.usage'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'container.cpu.usage',
  },

  {
    id: 'container_cpu_ecs',
    displayName: 'CPU Usage',
    description: 'Container CPU utilization',
    dataSource: 'ecs',
    requiredFields: ['docker.cpu.total.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'docker.cpu.total.pct',
  },

  {
    id: 'container_memory_otel',
    displayName: 'Memory Usage',
    description: 'Container memory usage',
    dataSource: 'otel',
    requiredFields: ['container.memory.usage'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'container.memory.usage',
  },

  {
    id: 'container_memory_ecs',
    displayName: 'Memory Usage',
    description: 'Container memory utilization',
    dataSource: 'ecs',
    requiredFields: ['docker.memory.usage.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'docker.memory.usage.pct',
  },
];

/**
 * Curated metrics for Process entities
 */
export const PROCESS_METRICS: CuratedMetricQuery[] = [
  {
    id: 'process_cpu_otel',
    displayName: 'CPU Usage',
    description: 'Process CPU utilization',
    dataSource: 'otel',
    requiredFields: ['process.cpu.utilization'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'process.cpu.utilization',
  },

  {
    id: 'process_cpu_ecs',
    displayName: 'CPU Usage',
    description: 'Process CPU utilization',
    dataSource: 'ecs',
    requiredFields: ['system.process.cpu.total.norm.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.process.cpu.total.norm.pct',
  },

  {
    id: 'process_memory_otel',
    displayName: 'Memory Usage',
    description: 'Process memory usage',
    dataSource: 'otel',
    requiredFields: ['process.memory.usage'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'process.memory.usage',
  },

  {
    id: 'process_memory_ecs',
    displayName: 'Memory Usage',
    description: 'Process memory usage percentage',
    dataSource: 'ecs',
    requiredFields: ['system.process.memory.rss.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'system.process.memory.rss.pct',
  },
];
