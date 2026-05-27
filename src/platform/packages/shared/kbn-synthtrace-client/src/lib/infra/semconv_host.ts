/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */
import type { Fields } from '../entity';
import { Entity } from '../entity';
import { Serializable } from '../serializable';

interface SemconvHostDocument extends Fields {
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'host.os.name'?: string;
  'host.ip'?: string;
  'cloud.provider'?: string;
  'cloud.region'?: string;
  'resource.attributes.host.name'?: string;
  'resource.attributes.os.type'?: string;
  'data_stream.dataset'?: string;
  'data_stream.type'?: string;
  'data_stream.namespace'?: string;
}

export interface SemconvHostMetricsDocument extends SemconvHostDocument {
  'metricset.name'?: string;
  state?: string;
  direction?: string;
  'metrics.system.cpu.utilization'?: number;
  'metrics.system.cpu.logical.count'?: number;
  'metrics.system.cpu.load_average.1m'?: number;
  'system.memory.utilization'?: number;
  'system.memory.usage'?: number;
  'metrics.system.filesystem.usage'?: number;
  'metrics.system.network.io'?: number;
  'device.keyword'?: string;
}

class SemconvHostMetrics extends Serializable<SemconvHostMetricsDocument> {}

export class SemconvHost extends Entity<SemconvHostDocument> {
  cpu() {
    const loadAvg1m = 1 + Math.random() * 3;
    return [
      { state: 'idle', utilization: 0.3 + Math.random() * 0.4 },
      { state: 'wait', utilization: Math.random() * 0.1 },
      { state: 'user', utilization: Math.random() * 0.3 },
      { state: 'system', utilization: Math.random() * 0.2 },
    ].map(
      ({ state, utilization }) =>
        new SemconvHostMetrics({
          ...this.fields,
          state,
          'metricset.name': 'cpu',
          'metrics.system.cpu.utilization': utilization,
          'metrics.system.cpu.logical.count': 4,
          'metrics.system.cpu.load_average.1m': loadAvg1m,
        })
    );
  }

  memory() {
    const total = 16 * 1024 * 1024 * 1024;
    const used = total * (0.4 + Math.random() * 0.3);
    const free = total - used;
    return [
      { state: 'used', utilization: used / total, usage: used },
      { state: 'free', utilization: free / total, usage: free },
      { state: 'cached', utilization: 0.1, usage: total * 0.1 },
      { state: 'buffered', utilization: 0.05, usage: total * 0.05 },
      { state: 'slab_reclaimable', utilization: 0.02, usage: total * 0.02 },
      { state: 'slab_unreclaimable', utilization: 0.01, usage: total * 0.01 },
    ].map(
      ({ state, utilization, usage }) =>
        new SemconvHostMetrics({
          ...this.fields,
          state,
          'metricset.name': 'memory',
          // The semconv `memoryUsage` Lens formula targets `system.memory.utilization`
          // (no `metrics.` prefix) to match how real OTel collectors land that field;
          // the `metrics.*` variants are kept for the formulas that do use the prefix.
          'system.memory.utilization': utilization,
          'system.memory.usage': usage,
        })
    );
  }

  filesystem() {
    const totalBytes = 100 * 1024 * 1024 * 1024;
    const usedPct = 0.3 + Math.random() * 0.4;
    const usedBytes = totalBytes * usedPct;
    const freeBytes = totalBytes - usedBytes;
    return [
      { state: 'used', 'metrics.system.filesystem.usage': usedBytes },
      { state: 'free', 'metrics.system.filesystem.usage': freeBytes },
    ].map(
      (fs) =>
        new SemconvHostMetrics({
          ...this.fields,
          ...fs,
          'metricset.name': 'filesystem',
        })
    );
  }

  network() {
    return [
      { direction: 'transmit', io: Math.floor(Math.random() * 1e9) },
      { direction: 'receive', io: Math.floor(Math.random() * 1e9) },
    ].map(
      ({ direction, io }) =>
        new SemconvHostMetrics({
          ...this.fields,
          direction,
          'metricset.name': 'network',
          'device.keyword': 'eth0',
          'metrics.system.network.io': io,
        })
    );
  }
}

export function semconvHost(name: string): SemconvHost {
  return new SemconvHost({
    'agent.id': `agent-${name}`,
    'host.hostname': name,
    'host.name': name,
    'host.os.name': 'linux',
    'host.ip': '122.122.122.122',
    'cloud.provider': 'aws',
    'cloud.region': 'us-east-1',
    'resource.attributes.host.name': name,
    'resource.attributes.os.type': 'linux',
    'data_stream.dataset': 'hostmetricsreceiver.otel',
    'data_stream.type': 'metrics',
    'data_stream.namespace': 'default',
  });
}
