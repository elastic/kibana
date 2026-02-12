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
import { k8sNode } from './k8s_node';
import { pod } from './pod';

interface HostDocument extends Fields {
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'metricset.name'?: string;
  'event.module'?: string;
  'data_stream.dataset'?: string;
  'event.dataset'?: string;
  'service.name'?: string;
  'host.ip'?: string;
  'host.os.name'?: string;
  'host.os.version'?: string;
  'host.os.platform'?: string;
  'cloud.provider'?: string;
}

export class Host extends Entity<HostDocument> {
  cpu(fields?: {
    'system.cpu.total.norm.pct'?: number;
    'system.cpu.user.pct'?: number;
    'system.cpu.system.pct'?: number;
    'system.cpu.cores'?: number;
    'process.cpu.pct'?: number;
    'system.cpu.nice.pct'?: number;
  }) {
    return new HostMetrics({
      ...this.fields,
      'system.cpu.total.norm.pct': fields?.['system.cpu.total.norm.pct'] ?? 0.98,
      'system.cpu.user.pct': fields?.['system.cpu.user.pct'] ?? 0.805,
      'system.cpu.system.pct': fields?.['system.cpu.system.pct'] ?? 0.704,
      'system.cpu.cores': fields?.['system.cpu.cores'] ?? 16,
      'process.cpu.pct': fields?.['process.cpu.pct'] ?? 0.1,
      'system.cpu.nice.pct': fields?.['system.cpu.nice.pct'] ?? 0.1,
      'metricset.period': 10000,
      'metricset.name': 'cpu',
    });
  }

  memory(fields?: {
    'system.memory.actual.free'?: number;
    'system.memory.actual.used.bytes'?: number;
    'system.memory.actual.used.pct'?: number;
    'system.memory.total'?: number;
    'system.memory.used.bytes'?: number;
    'system.memory.used.pct'?: number;
    'process.memory.pct'?: number;
  }) {
    return new HostMetrics({
      ...this.fields,
      'system.memory.actual.free': fields?.['system.memory.actual.free'] ?? 44704067584,
      'system.memory.actual.used.bytes': fields?.['system.memory.actual.used.bytes'] ?? 24015409152,
      'system.memory.actual.used.pct': fields?.['system.memory.actual.used.pct'] ?? 0.35,
      'system.memory.total': fields?.['system.memory.total'] ?? 68719476736,
      'system.memory.used.bytes': fields?.['system.memory.used.bytes'] ?? 39964708864,
      'system.memory.used.pct': fields?.['system.memory.used.pct'] ?? 0.582,
      'process.memory.pct': fields?.['process.memory.pct'] ?? 0.1,
      'metricset.period': 10000,
      'metricset.name': 'memory',
    });
  }

  network(fields?: {
    'host.network.ingress.bytes'?: number;
    'host.network.egress.bytes'?: number;
    'metricset.period'?: number;
  }) {
    return new HostMetrics({
      ...this.fields,
      'host.network.ingress.bytes': fields?.['host.network.ingress.bytes'] ?? 2871285,
      'host.network.egress.bytes': fields?.['host.network.egress.bytes'] ?? 2904987,
      'metricset.period': fields?.['metricset.period'] ?? 10000,
      'metricset.name': 'network',
    });
  }

  load() {
    return new HostMetrics({
      ...this.fields,
      'system.load': {
        1: 3,
        cores: 16,
      },
      'metricset.period': 10000,
      'metricset.name': 'load',
    });
  }

  core() {
    return new HostMetrics({
      ...this.fields,
      'system.core.total.pct': 0.98,
      'system.core.user.pct': 0.805,
      'system.core.nice.pct': 0.704,
      'system.core.idle.pct': 0.1,
      'system.core.iowait.pct': 0.1,
      'system.core.irq.pct': 0.1,
      'system.core.softirq.pct': 0.1,
      'system.core.steal.pct': 0.1,
      'metricset.period': 10000,
      'metricset.name': 'core',
    });
  }

  filesystem(fields?: { 'system.filesystem.used.pct'?: number }) {
    return new HostMetrics({
      ...this.fields,
      'system.filesystem.used.pct': fields?.['system.filesystem.used.pct'] ?? 12.23,
      'metricset.period': 10000,
      'metricset.name': 'filesystem',
    });
  }

  diskio(fields?: {
    'system.diskio.read.count'?: number;
    'system.diskio.write.count'?: number;
    'system.diskio.read.bytes'?: number;
    'system.diskio.write.bytes'?: number;
  }) {
    return new HostMetrics({
      ...this.fields,
      'system.diskio.read.count': fields?.['system.diskio.read.count'] ?? 3538413,
      'system.diskio.write.count': fields?.['system.diskio.write.count'] ?? 4694333,
      'system.diskio.read.bytes': fields?.['system.diskio.read.bytes'] ?? 33147297792,
      'system.diskio.write.bytes': fields?.['system.diskio.write.bytes'] ?? 48595652608,
      'metricset.period': 10000,
      'metricset.name': 'diskio',
    });
  }

  pod(uid: string) {
    return pod(uid, this.fields['host.hostname']);
  }

  node(podUid: string) {
    return k8sNode(this.fields['host.hostname'], podUid);
  }
}

export interface HostMetricsDocument extends HostDocument {
  'agent.id': string;
  'metricset.period'?: number;
  'metricset.name'?: string;
  'system.cpu.total.norm.pct'?: number;
  'system.cpu.user.pct'?: number;
  'system.cpu.system.pct'?: number;
  'system.cpu.cores'?: number;
  'system.diskio.read.count'?: number;
  'system.diskio.write.count'?: number;
  'system.diskio.read.bytes'?: number;
  'system.diskio.write.bytes'?: number;
  'system.filesystem.used.pct'?: number;
  'system.memory.actual.used.pct'?: number;
  'system.memory.total'?: number;
  'system.memory.actual.used.bytes'?: number;
  'system.memory.actual.free'?: number;
  'system.memory.used.bytes'?: number;
  'system.memory.used.pct'?: number;
  'system.load'?: { 1: number; cores: number };
  'host.network.ingress.bytes'?: number;
  'host.network.egress.bytes'?: number;
  'process.cpu.pct'?: number;
  'process.memory.pct'?: number;
  'system.core.total.pct'?: number;
  'system.core.user.pct'?: number;
  'system.core.nice.pct'?: number;
  'system.core.idle.pct'?: number;
  'system.core.iowait.pct'?: number;
  'system.core.irq.pct'?: number;
  'system.core.softirq.pct'?: number;
  'system.core.steal.pct'?: number;
  'system.cpu.nice.pct'?: number;
}

class HostMetrics extends Serializable<HostMetricsDocument> {}

export function host(name: string): Host {
  return new Host({
    'event.module': 'system',
    'agent.id': 'synthtrace',
    'host.hostname': name,
    'host.name': name,
    'host.ip': '10.128.0.2',
    'host.os.name': 'Linux',
    'host.os.platform': 'ubuntu',
    'host.os.version': '4.19.76-linuxkit',
    'cloud.provider': 'gcp',
  });
}

export function minimalHost(name: string): Host {
  return new Host({
    'agent.id': 'synthtrace',
    'host.hostname': name,
    'host.name': name,
  });
}
