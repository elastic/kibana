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
import { k8sContainer } from './k8s_container';

interface PodDocument extends Fields {
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'kubernetes.pod.uid': string;
  'kubernetes.node.name': string;
  'metricset.name'?: string;
}

export class Pod extends Entity<PodDocument> {
  metrics() {
    return new PodMetrics({
      ...this.fields,
      'kubernetes.pod.cpu.usage.limit.pct': 46,
    });
  }

  container(id: string) {
    return k8sContainer(id, this.fields['kubernetes.pod.uid'], this.fields['kubernetes.node.name']);
  }
}

export interface PodMetricsDocument extends PodDocument {
  'kubernetes.pod.cpu.usage.limit.pct': number;
}

class PodMetrics extends Serializable<PodMetricsDocument> {}

export function pod(uid: string, nodeName: string) {
  return new Pod({
    'kubernetes.pod.uid': uid,
    'kubernetes.node.name': nodeName,
    'agent.id': 'synthtrace',
    'host.hostname': nodeName,
    'host.name': nodeName,
  });
}
