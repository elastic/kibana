/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
import { ContainerAsset } from '../assets';
import { Entity, Fields } from '../entity';
import { Serializable } from '../serializable';

interface ContainerDocument extends Fields {
  'container.id': string;
  'kubernetes.pod.uid': string;
  'kubernetes.node.name': string;
  'metricset.name'?: string;
}

export class Container extends Entity<ContainerDocument> {
  metrics() {
    return new ContainerMetrics({
      ...this.fields,
      'kubernetes.container.cpu.usage.limit.pct': 46,
    });
  }

  asset() {
    return new ContainerAsset({
      'asset.kind': 'container',
      'asset.id': this.fields['container.id'],
      'asset.name': this.fields['container.id'],
      'asset.ean': `container:${this.fields['container.id']}`,
    });
  }
}

export interface ContainerMetricsDocument extends ContainerDocument {
  'kubernetes.container.cpu.usage.limit.pct': number;
}

class ContainerMetrics extends Serializable<ContainerMetricsDocument> {}

export function container(id: string, uid: string, nodeName: string) {
  return new Container({
    'container.id': id,
    'kubernetes.pod.uid': uid,
    'kubernetes.node.name': nodeName,
  });
}
