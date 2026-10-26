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
import { k8sContainer } from './k8s_container';

interface PodDocument extends Fields {
  'agent.id': string;
  'host.hostname': string;
  'host.name': string;
  'kubernetes.pod.uid': string;
  'kubernetes.pod.name': string;
  'kubernetes.pod.ip'?: string;
  'kubernetes.node.name': string;
  'metricset.name'?: string;
  'event.module'?: string;
  'event.dataset'?: string;
  'host.ip'?: string;
  'host.os.name'?: string;
  'host.os.version'?: string;
  'host.os.platform'?: string;
  'host.os.kernel'?: string;
  'cloud.provider'?: string;
  'cloud.instance.id'?: string;
  'cloud.instance.name'?: string;
  'cloud.availability_zone'?: string;
  'cloud.machine.type'?: string;
  'cloud.project.id'?: string;
}

const NETWORK_BYTES_INITIAL = 1_000_000;
const NETWORK_BYTES_STEP = 250_000;

export class Pod extends Entity<PodDocument> {
  private readonly networkBytesByDirection = new Map<'rx' | 'tx', number>();

  // One document per timestamp carrying every pod metric. The routing transform sends a document
  // with `metricset.name` of cpu/memory/network to a `metrics-system.*` data stream, so pod
  // documents deliberately carry no metricset and stay in `metrics-kubernetes.pod-default`.
  metrics() {
    return new PodMetrics({
      ...this.fields,
      'kubernetes.pod.cpu.usage.limit.pct': 46,
      'kubernetes.pod.cpu.usage.node.pct': 0.1,
      'kubernetes.pod.memory.usage.limit.pct': 0.33,
      'kubernetes.pod.memory.usage.node.pct': 0.12,
      // Monotonic counters: the network series takes a derivative of a max.
      'kubernetes.pod.network.rx.bytes': this.nextNetworkBytes('rx'),
      'kubernetes.pod.network.tx.bytes': this.nextNetworkBytes('tx'),
    });
  }

  private nextNetworkBytes(direction: 'rx' | 'tx'): number {
    const previous =
      this.networkBytesByDirection.get(direction) ?? NETWORK_BYTES_INITIAL - NETWORK_BYTES_STEP;
    const next = previous + NETWORK_BYTES_STEP;
    this.networkBytesByDirection.set(direction, next);
    return next;
  }

  container(id: string) {
    return k8sContainer(id, this.fields['kubernetes.pod.uid'], this.fields['kubernetes.node.name']);
  }
}

export interface PodMetricsDocument extends PodDocument {
  'kubernetes.pod.cpu.usage.limit.pct': number;
  'kubernetes.pod.cpu.usage.node.pct'?: number;
  'kubernetes.pod.memory.usage.limit.pct'?: number;
  'kubernetes.pod.memory.usage.node.pct'?: number;
  'kubernetes.pod.network.rx.bytes'?: number;
  'kubernetes.pod.network.tx.bytes'?: number;
}

class PodMetrics extends Serializable<PodMetricsDocument> {}

export interface PodOptions {
  name?: string;
  ip?: string;
}

export function pod(uid: string, nodeName: string, opts?: PodOptions) {
  return new Pod({
    'kubernetes.pod.uid': uid,
    // `findInventoryFields('pod').name` is `kubernetes.pod.name`; it drives the Metric Detail page
    // title and falls back to the uid when absent.
    'kubernetes.pod.name': opts?.name ?? uid,
    ...(opts?.ip !== undefined ? { 'kubernetes.pod.ip': opts.ip } : {}),
    'kubernetes.node.name': nodeName,
    'agent.id': 'synthtrace',
    // The Metric Detail metadata strip resolves a pod through `kubernetes.node.name` and then looks
    // the node up by `host.name`. These documents are the only ones carrying that node name, so they
    // also carry the host metadata the strip reads, the way `add_host_metadata` /
    // `add_cloud_metadata` enrich the Metricbeat Kubernetes module.
    'host.hostname': nodeName,
    'host.name': nodeName,
    'host.ip': '10.128.0.2',
    'host.os.name': 'Linux',
    'host.os.platform': 'ubuntu',
    'host.os.version': '4.19.76-linuxkit',
    'host.os.kernel': '5.15.0-91-generic',
    'cloud.provider': 'gcp',
    'cloud.instance.id': `instance-${nodeName}`,
    'cloud.instance.name': nodeName,
    'cloud.availability_zone': 'us-central1-a',
    'cloud.machine.type': 'n1-standard-4',
    'cloud.project.id': 'elastic-obs-integrations-dev',
    'event.module': 'kubernetes',
    // `getMetricMetadata` buckets `event.dataset` into `features`, and the pod TSVB models declare
    // `requires: ['kubernetes.pod']`. Without this the feature list is empty, every required TSVB
    // metric is filtered out, and the Metric Detail page renders "There is no data to display."
    'event.dataset': 'kubernetes.pod',
  });
}
