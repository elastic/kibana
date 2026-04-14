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
  'system.cpu.utilization'?: number;
  'system.cpu.logical.count'?: number;
  'system.cpu.load_average.1m'?: number;
  'system.memory.utilization'?: number;
  'system.memory.usage'?: number;
  'metrics.system.filesystem.usage'?: number;
  'system.network.io'?: number;
  'device.keyword'?: string;
}

class SemconvHostMetrics extends Serializable<SemconvHostMetricsDocument> {}

export class SemconvHost extends Entity<SemconvHostDocument> {
  cpu() {
    const idle = 0.3 + Math.random() * 0.4;
    const wait = Math.random() * 0.1;
    return [
      { state: 'idle', 'system.cpu.utilization': idle },
      { state: 'wait', 'system.cpu.utilization': wait },
      { state: 'user', 'system.cpu.utilization': Math.random() * 0.3 },
      { state: 'system', 'system.cpu.utilization': Math.random() * 0.2 },
    ].map(
      (cpu) =>
        new SemconvHostMetrics({
          ...this.fields,
          ...cpu,
          'metricset.name': 'cpu',
          'system.cpu.logical.count': 4,
          'system.cpu.load_average.1m': 1 + Math.random() * 3,
        })
    );
  }

  memory() {
    const total = 16 * 1024 * 1024 * 1024;
    const used = total * (0.4 + Math.random() * 0.3);
    const free = total - used;
    return [
      { state: 'used', 'system.memory.utilization': used / total, 'system.memory.usage': used },
      { state: 'free', 'system.memory.utilization': free / total, 'system.memory.usage': free },
      {
        state: 'cached',
        'system.memory.utilization': 0.1,
        'system.memory.usage': total * 0.1,
      },
      {
        state: 'buffered',
        'system.memory.utilization': 0.05,
        'system.memory.usage': total * 0.05,
      },
      {
        state: 'slab_reclaimable',
        'system.memory.utilization': 0.02,
        'system.memory.usage': total * 0.02,
      },
      {
        state: 'slab_unreclaimable',
        'system.memory.utilization': 0.01,
        'system.memory.usage': total * 0.01,
      },
    ].map(
      (mem) =>
        new SemconvHostMetrics({
          ...this.fields,
          ...mem,
          'metricset.name': 'memory',
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
      { direction: 'transmit', 'system.network.io': Math.floor(Math.random() * 1e9) },
      { direction: 'receive', 'system.network.io': Math.floor(Math.random() * 1e9) },
    ].map(
      (net) =>
        new SemconvHostMetrics({
          ...this.fields,
          ...net,
          'metricset.name': 'network',
          'device.keyword': 'eth0',
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
