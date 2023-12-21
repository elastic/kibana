/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
import { HostAsset } from '../assets';
import { Entity, Fields } from '../entity';
import { Serializable } from '../serializable';
import { pod } from './pod';

interface HostDocument extends Fields {
  'host.hostname': string;
  'host.name': string;
  'metricset.name'?: string;
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
      'system.memory.actual.used.pct': 0.351,
      'system.memory.total': 68719476736,
      'system.memory.actual.used.bytes': 24141996032,
      'metricset.period': 10000,
      'metricset.name': 'cpu',
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
      'system.load.1': 3,
      'system.load.cores': 16,
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

  metrics() {
    return new HostMetrics({
      ...this.fields,
      'system.cpu.total.norm.pct': 46,
    });
  }

  asset() {
    return new HostAsset({
      'asset.kind': 'host',
      'asset.id': this.fields['host.hostname'],
      'asset.name': this.fields['host.hostname'],
      'asset.ean': `host:${this.fields['host.hostname']}`,
    });
  }

  pod(uid: string) {
    return pod(uid, this.fields['host.hostname']);
  }
}

export interface HostMetricsDocument extends HostDocument {
  'metricset.period'?: number;
  'metricset.name'?: string;
  'system.cpu.total.norm.pct'?: number;
  'system.cpu.user.pct'?: number;
  'system.cpu.system.pct'?: number;
  'system.cpu.cores'?: number;
  'system.filesystem.used.pct'?: number;
  'system.memory.actual.used.pct'?: number;
  'system.memory.total'?: number;
  'system.memory.actual.used.bytes'?: number;
  'system.load.1'?: number;
  'system.load.cores'?: number;
  'host.network.ingress.bytes'?: number;
  'host.network.egress.bytes'?: number;
}

class HostMetrics extends Serializable<HostMetricsDocument> {}

export function host(name: string): Host {
  return new Host({
    'host.hostname': name,
    'host.name': name,
  });
}
