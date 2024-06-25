/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint-disable max-classes-per-file */
import { Entity, Fields } from '../entity';
import { Serializable } from '../serializable';
import { pod } from './pod';

interface HostDocument extends Fields {
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'metricset.name'?: string;
  'event.module'?: string;
  'service.name'?: string;
}

class Host extends Entity<HostDocument> {
  cpu() {
    return new HostMetrics({
      ...this.fields,
      'system.cpu.total.norm.pct': 0.094,
      'system.cpu.user.pct': 0.805,
      'system.cpu.system.pct': 0.704,
      'system.cpu.cores': 16,
      'metricset.period': 10000,
      'metricset.name': 'cpu',
    });
  }

  memory() {
    return new HostMetrics({
      ...this.fields,
      'system.memory.actual.free': 44704067584,
      'system.memory.actual.used.bytes': 24015409152,
      'system.memory.actual.used.pct': 0.35,
      'system.memory.total': 68719476736,
      'system.memory.used.bytes': 39964708864,
      'system.memory.used.pct': 0.582,
      'metricset.period': 10000,
      'metricset.name': 'memory',
    });
  }

  network() {
    return new HostMetrics({
      ...this.fields,
      'host.network.ingress.bytes': 2871285,
      'host.network.egress.bytes': 2904987,
      'metricset.period': 10000,
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

  filesystem() {
    return new HostMetrics({
      ...this.fields,
      'system.filesystem.used.pct': 12.23,
      'metricset.period': 10000,
      'metricset.name': 'filesystem',
    });
  }

  diskio() {
    return new HostMetrics({
      ...this.fields,
      'system.diskio.read.count': 3538413,
      'system.diskio.write.count': 4694333,
      'system.diskio.read.bytes': 33147297792,
      'system.diskio.write.bytes': 48595652608,
      'metricset.period': 10000,
      'metricset.name': 'diskio',
    });
  }

  pod(uid: string) {
    return pod(uid, this.fields['host.hostname']);
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
}

class HostMetrics extends Serializable<HostMetricsDocument> {}

export function host(name: string): Host {
  return new Host({
    'event.module': 'system',
    'agent.id': 'synthtrace',
    'host.hostname': name,
    'host.name': name,
  });
}
