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

interface K8sNodeDocument extends Fields {
  'kubernetes.node.name': string;
  'kubernetes.pod.uid'?: string;
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'metricset.name'?: string;
  'event.dataset'?: string;
}

export class K8sNode extends Entity<K8sNodeDocument> {
  metrics() {
    return new K8sNodeMetrics({
      ...this.fields,
      'kubernetes.node.cpu.allocatable.cores': 0.53,
      'kubernetes.node.cpu.usage.nanocores': 0.32,
      'kubernetes.node.memory.allocatable.bytes': 0.46,
      'kubernetes.node.memory.usage.bytes': 0.86,
      'kubernetes.node.fs.capacity.bytes': 100,
      'kubernetes.node.fs.used.bytes': 100,
      'kubernetes.node.pod.allocatable.total': 10,
    });
  }
}

export interface K8sNodeMetricsDocument extends K8sNodeDocument {
  'kubernetes.node.cpu.allocatable.cores': number;
  'kubernetes.node.cpu.usage.nanocores': number;
  'kubernetes.node.memory.allocatable.bytes': number;
  'kubernetes.node.memory.usage.bytes': number;
  'kubernetes.node.fs.capacity.bytes': number;
  'kubernetes.node.fs.used.bytes': number;
  'kubernetes.node.pod.allocatable.total': number;
}

class K8sNodeMetrics extends Serializable<K8sNodeMetricsDocument> {}

export function k8sNode(name: string, podUid: string) {
  return new K8sNode({
    'kubernetes.node.name': name,
    'kubernetes.pod.uid': podUid,
    'agent.id': 'synthtrace',
    'host.hostname': name,
    'host.name': name,
    'event.dataset': 'kubernetes.node',
  });
}
