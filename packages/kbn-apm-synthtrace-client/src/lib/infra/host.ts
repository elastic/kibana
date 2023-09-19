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
}

class Host extends Entity<HostDocument> {
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
  'system.cpu.total.norm.pct': number;
}

class HostMetrics extends Serializable<HostMetricsDocument> {}

export function host(name: string): Host {
  return new Host({
    'host.hostname': name,
  });
}
