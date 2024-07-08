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

interface K8sContainerDocument extends Fields {
  'container.id': string;
  'kubernetes.pod.uid': string;
  'kubernetes.node.name': string;
  'metricset.name'?: string;
  'container.name'?: string;
  'container.image.name'?: string;
  'container.runtime'?: string;
  'host.name'?: string;
  'cloud.provider'?: string;
  'cloud.instance.id'?: string;
  'cloud.image.id'?: string;
  'event.dataset'?: string;
}

export class K8sContainer extends Entity<K8sContainerDocument> {
  metrics() {
    return new K8sContainerMetrics({
      ...this.fields,
      'kubernetes.container.cpu.usage.limit.pct': 46,
      'kubernetes.container.memory.usage.limit.pct': 30,
    });
  }
}

export interface K8sContainerMetricsDocument extends K8sContainerDocument {
  'kubernetes.container.cpu.usage.limit.pct': number;
  'kubernetes.container.memory.usage.limit.pct': number;
}

class K8sContainerMetrics extends Serializable<K8sContainerMetricsDocument> {}

export function k8sContainer(id: string, uid: string, nodeName: string): K8sContainer {
  return new K8sContainer({
    'container.id': id,
    'kubernetes.pod.uid': uid,
    'kubernetes.node.name': nodeName,
    'container.name': `container-${id}`,
    'container.runtime': 'containerd',
    'container.image.name': 'image-1',
    'host.name': 'host-1',
    'cloud.instance.id': 'instance-1',
    'cloud.image.id': 'image-1',
    'cloud.provider': 'aws',
    'event.dataset': 'kubernetes.container',
  });
}
