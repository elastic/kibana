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

/**
 * Provisional kubeletstats SemConv names. Keep every SemConv field name in this
 * file so #291338 / slice 06 reconciliation is a one-file change.
 */
export const KUBELETSTATS_DATASET = 'kubeletstatsreceiver.otel' as const;
export const K8S_POD_UID = 'k8s.pod.uid' as const;
export const K8S_POD_NAME = 'k8s.pod.name' as const;
export const K8S_NAMESPACE_NAME = 'k8s.namespace.name' as const;
export const K8S_NODE_NAME = 'k8s.node.name' as const;
export const K8S_DEPLOYMENT_NAME = 'k8s.deployment.name' as const;
export const SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION =
  'metrics.k8s.pod.cpu_limit_utilization' as const;
export const SEMCONV_K8S_POD_CPU_NODE_UTILIZATION = 'metrics.k8s.pod.cpu.node.utilization' as const;
export const SEMCONV_K8S_POD_CPU_USAGE = 'metrics.k8s.pod.cpu.usage' as const;
export const SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION =
  'metrics.k8s.pod.memory_limit_utilization' as const;
export const SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION =
  'metrics.k8s.pod.memory.node.utilization' as const;
export const SEMCONV_K8S_POD_MEMORY_WORKING_SET = 'metrics.k8s.pod.memory.working_set' as const;
export const SEMCONV_K8S_POD_MEMORY_USAGE = 'metrics.k8s.pod.memory.usage' as const;
export const SEMCONV_K8S_POD_NETWORK_IO = 'metrics.k8s.pod.network.io' as const;

const RESOURCE_K8S_POD_UID = 'resource.attributes.k8s.pod.uid' as const;
const RESOURCE_K8S_POD_NAME = 'resource.attributes.k8s.pod.name' as const;
const RESOURCE_K8S_NAMESPACE_NAME = 'resource.attributes.k8s.namespace.name' as const;
const RESOURCE_K8S_NODE_NAME = 'resource.attributes.k8s.node.name' as const;

const CPU_LIMIT_UTILIZATION = 0.46;
const CPU_NODE_UTILIZATION = 0.32;
const CPU_USAGE = 0.21;
const MEMORY_LIMIT_UTILIZATION = 0.55;
const MEMORY_NODE_UTILIZATION = 0.4;
const MEMORY_WORKING_SET_BYTES = 512 * 1024 * 1024;
const MEMORY_USAGE_BYTES = 400 * 1024 * 1024;
const NETWORK_IO_INITIAL = 1_000_000;
const NETWORK_IO_STEP = 100_000;

export type SemconvNetworkDirection = 'receive' | 'transmit';

interface SemconvPodDocument extends Fields {
  [K8S_POD_UID]: string;
  [K8S_POD_NAME]: string;
  [K8S_NAMESPACE_NAME]: string;
  [K8S_NODE_NAME]: string;
  [K8S_DEPLOYMENT_NAME]?: string;
  [RESOURCE_K8S_POD_UID]?: string;
  [RESOURCE_K8S_POD_NAME]?: string;
  [RESOURCE_K8S_NAMESPACE_NAME]?: string;
  [RESOURCE_K8S_NODE_NAME]?: string;
  'data_stream.dataset'?: string;
  'data_stream.type'?: string;
  'data_stream.namespace'?: string;
}

export interface SemconvPodMetricsDocument extends SemconvPodDocument {
  'metricset.name'?: string;
  direction?: SemconvNetworkDirection;
  interface?: string;
  [SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION]?: number;
  [SEMCONV_K8S_POD_CPU_NODE_UTILIZATION]?: number;
  [SEMCONV_K8S_POD_CPU_USAGE]?: number;
  [SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION]?: number;
  [SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION]?: number;
  [SEMCONV_K8S_POD_MEMORY_WORKING_SET]?: number;
  [SEMCONV_K8S_POD_MEMORY_USAGE]?: number;
  [SEMCONV_K8S_POD_NETWORK_IO]?: number;
}

class SemconvPodMetrics extends Serializable<SemconvPodMetricsDocument> {}

export interface SemconvPodNetworkOptions {
  interfaces?: string[];
}

export class SemconvPod extends Entity<SemconvPodDocument> {
  private readonly networkIoBySeries = new Map<string, number>();

  cpu(): SemconvPodMetrics[] {
    return [
      new SemconvPodMetrics({
        ...this.fields,
        'metricset.name': 'cpu',
        [SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION]: CPU_LIMIT_UTILIZATION,
        [SEMCONV_K8S_POD_CPU_NODE_UTILIZATION]: CPU_NODE_UTILIZATION,
        [SEMCONV_K8S_POD_CPU_USAGE]: CPU_USAGE,
      }),
    ];
  }

  cpuWithoutLimit(): SemconvPodMetrics[] {
    return [
      new SemconvPodMetrics({
        ...this.fields,
        'metricset.name': 'cpu',
        [SEMCONV_K8S_POD_CPU_NODE_UTILIZATION]: CPU_NODE_UTILIZATION,
        [SEMCONV_K8S_POD_CPU_USAGE]: CPU_USAGE,
      }),
    ];
  }

  memory(): SemconvPodMetrics[] {
    return [
      new SemconvPodMetrics({
        ...this.fields,
        'metricset.name': 'memory',
        [SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION]: MEMORY_LIMIT_UTILIZATION,
        [SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION]: MEMORY_NODE_UTILIZATION,
        [SEMCONV_K8S_POD_MEMORY_WORKING_SET]: MEMORY_WORKING_SET_BYTES,
        [SEMCONV_K8S_POD_MEMORY_USAGE]: MEMORY_USAGE_BYTES,
      }),
    ];
  }

  network(opts?: SemconvPodNetworkOptions): SemconvPodMetrics[] {
    const interfaces = opts?.interfaces ?? ['eth0'];
    const directions: SemconvNetworkDirection[] = ['receive', 'transmit'];

    return interfaces.flatMap((iface) =>
      directions.map(
        (direction) =>
          new SemconvPodMetrics({
            ...this.fields,
            direction,
            interface: iface,
            'metricset.name': 'network',
            [SEMCONV_K8S_POD_NETWORK_IO]: this.nextNetworkIo(direction, iface),
          })
      )
    );
  }

  metrics(opts?: SemconvPodNetworkOptions): SemconvPodMetrics[] {
    return [...this.cpu(), ...this.memory(), ...this.network(opts)];
  }

  private nextNetworkIo(direction: SemconvNetworkDirection, iface: string): number {
    const key = `${direction}:${iface}`;
    const previous = this.networkIoBySeries.get(key) ?? NETWORK_IO_INITIAL - NETWORK_IO_STEP;
    const next = previous + NETWORK_IO_STEP;
    this.networkIoBySeries.set(key, next);
    return next;
  }
}

export interface SemconvPodOptions {
  name?: string;
  namespace?: string;
  deployment?: string;
}

export function semconvPod(uid: string, nodeName: string, opts?: SemconvPodOptions): SemconvPod {
  const name = opts?.name ?? uid;
  const namespace = opts?.namespace ?? 'default';

  return new SemconvPod({
    [K8S_POD_UID]: uid,
    [K8S_POD_NAME]: name,
    [K8S_NAMESPACE_NAME]: namespace,
    [K8S_NODE_NAME]: nodeName,
    ...(opts?.deployment !== undefined ? { [K8S_DEPLOYMENT_NAME]: opts.deployment } : {}),
    [RESOURCE_K8S_POD_UID]: uid,
    [RESOURCE_K8S_POD_NAME]: name,
    [RESOURCE_K8S_NAMESPACE_NAME]: namespace,
    [RESOURCE_K8S_NODE_NAME]: nodeName,
    'data_stream.dataset': KUBELETSTATS_DATASET,
    'data_stream.type': 'metrics',
    'data_stream.namespace': 'default',
  });
}
