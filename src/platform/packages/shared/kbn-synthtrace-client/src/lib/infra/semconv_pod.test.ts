/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  K8S_NAMESPACE_NAME,
  K8S_NODE_NAME,
  K8S_POD_CPU_LIMIT_UTILIZATION,
  K8S_POD_CPU_NODE_UTILIZATION,
  K8S_POD_CPU_USAGE,
  K8S_POD_MEMORY_LIMIT_UTILIZATION,
  K8S_POD_MEMORY_NODE_UTILIZATION,
  K8S_POD_MEMORY_USAGE,
  K8S_POD_MEMORY_WORKING_SET,
  K8S_POD_NAME,
  K8S_POD_NETWORK_IO,
  K8S_POD_UID,
  KUBELETSTATS_DATASET,
  SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_CPU_NODE_UTILIZATION,
  SEMCONV_K8S_POD_CPU_USAGE,
  SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_USAGE,
  SEMCONV_K8S_POD_MEMORY_WORKING_SET,
  SEMCONV_K8S_POD_NETWORK_IO,
  semconvPod,
} from './semconv_pod';

describe('semconvPod', () => {
  it('sets kubeletstats dataset and mirrors identity under resource.attributes', () => {
    const pod = semconvPod('semconv-pod-1-uid', 'semconv-host-1', {
      name: 'semconv-pod-1',
      namespace: 'kube-system',
    });

    expect(pod.fields['data_stream.dataset']).toBe(KUBELETSTATS_DATASET);
    expect(pod.fields['data_stream.type']).toBe('metrics');
    expect(pod.fields['data_stream.namespace']).toBe('default');
    expect(pod.fields[K8S_POD_UID]).toBe('semconv-pod-1-uid');
    expect(pod.fields[K8S_POD_NAME]).toBe('semconv-pod-1');
    expect(pod.fields[K8S_NAMESPACE_NAME]).toBe('kube-system');
    expect(pod.fields[K8S_NODE_NAME]).toBe('semconv-host-1');
    expect(pod.fields['resource.attributes.k8s.pod.uid']).toBe('semconv-pod-1-uid');
    expect(pod.fields['resource.attributes.k8s.pod.name']).toBe('semconv-pod-1');
    expect(pod.fields['resource.attributes.k8s.namespace.name']).toBe('kube-system');
    expect(pod.fields['resource.attributes.k8s.node.name']).toBe('semconv-host-1');
  });

  it('defaults pod name to uid', () => {
    const pod = semconvPod('semconv-pod-0', 'semconv-host-0');

    expect(pod.fields[K8S_POD_NAME]).toBe('semconv-pod-0');
    expect(pod.fields[K8S_NAMESPACE_NAME]).toBe('default');
  });

  it('emits limit utilization on cpu() and omits it on cpuWithoutLimit()', () => {
    const pod = semconvPod('semconv-pod-0', 'semconv-host-0');
    const [withLimit] = pod.cpu();
    const [withoutLimit] = pod.cpuWithoutLimit();

    expect(withLimit.fields[K8S_POD_CPU_LIMIT_UTILIZATION]).toBe(0.46);
    expect(withLimit.fields[SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION]).toBe(0.46);
    expect(withLimit.fields[K8S_POD_CPU_NODE_UTILIZATION]).toBe(0.32);
    expect(withLimit.fields[SEMCONV_K8S_POD_CPU_NODE_UTILIZATION]).toBe(0.32);
    expect(withLimit.fields[K8S_POD_CPU_USAGE]).toBe(0.21);
    expect(withLimit.fields[SEMCONV_K8S_POD_CPU_USAGE]).toBe(0.21);
    expect(withoutLimit.fields[K8S_POD_CPU_LIMIT_UTILIZATION]).toBeUndefined();
    expect(withoutLimit.fields[SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION]).toBeUndefined();
    expect(withoutLimit.fields[K8S_POD_CPU_NODE_UTILIZATION]).toBe(0.32);
    expect(withoutLimit.fields[SEMCONV_K8S_POD_CPU_NODE_UTILIZATION]).toBe(0.32);
  });

  it('emits limit utilization on memory() and omits it on memoryWithoutLimit()', () => {
    const pod = semconvPod('semconv-pod-0', 'semconv-host-0');
    const [withLimit] = pod.memory();
    const [withoutLimit] = pod.memoryWithoutLimit();

    expect(withLimit.fields[K8S_POD_MEMORY_LIMIT_UTILIZATION]).toBe(0.55);
    expect(withLimit.fields[SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION]).toBe(0.55);
    expect(withLimit.fields[K8S_POD_MEMORY_NODE_UTILIZATION]).toBe(0.4);
    expect(withLimit.fields[SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION]).toBe(0.4);
    expect(withLimit.fields[K8S_POD_MEMORY_WORKING_SET]).toBe(400 * 1024 * 1024);
    expect(withLimit.fields[SEMCONV_K8S_POD_MEMORY_WORKING_SET]).toBe(400 * 1024 * 1024);
    expect(withLimit.fields[K8S_POD_MEMORY_USAGE]).toBe(512 * 1024 * 1024);
    expect(withLimit.fields[SEMCONV_K8S_POD_MEMORY_USAGE]).toBe(512 * 1024 * 1024);
    expect(withoutLimit.fields[K8S_POD_MEMORY_LIMIT_UTILIZATION]).toBeUndefined();
    expect(withoutLimit.fields[SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION]).toBeUndefined();
    expect(withoutLimit.fields[K8S_POD_MEMORY_NODE_UTILIZATION]).toBe(0.4);
    expect(withoutLimit.fields[SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION]).toBe(0.4);
    expect(withoutLimit.fields[K8S_POD_MEMORY_WORKING_SET]).toBe(400 * 1024 * 1024);
    expect(withoutLimit.fields[SEMCONV_K8S_POD_MEMORY_WORKING_SET]).toBe(400 * 1024 * 1024);
    expect(withoutLimit.fields[K8S_POD_MEMORY_USAGE]).toBe(512 * 1024 * 1024);
    expect(withoutLimit.fields[SEMCONV_K8S_POD_MEMORY_USAGE]).toBe(512 * 1024 * 1024);

    const workingSet = withLimit.fields[SEMCONV_K8S_POD_MEMORY_WORKING_SET];
    const usage = withLimit.fields[SEMCONV_K8S_POD_MEMORY_USAGE];
    expect(workingSet).toBeDefined();
    expect(usage).toBeDefined();
    // On a real kubelet, working set is a subset of usage (WorkingSetBytes ≤ UsageBytes).
    expect(Number(workingSet)).toBeLessThanOrEqual(Number(usage));
  });

  it('emits a monotonically increasing network counter per direction and interface', () => {
    const pod = semconvPod('semconv-pod-2', 'semconv-host-1');
    const first = pod.network({ interfaces: ['eth0', 'net1'] });
    const second = pod.network({ interfaces: ['eth0', 'net1'] });

    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);

    for (const firstDoc of first) {
      const match = second.find(
        (doc) =>
          doc.fields.direction === firstDoc.fields.direction &&
          doc.fields.interface === firstDoc.fields.interface
      );
      if (!match) {
        throw new Error(
          `missing second sample for ${firstDoc.fields.direction}/${firstDoc.fields.interface}`
        );
      }
      const firstIo = firstDoc.fields[SEMCONV_K8S_POD_NETWORK_IO];
      const secondIo = match.fields[SEMCONV_K8S_POD_NETWORK_IO];
      if (firstIo === undefined || secondIo === undefined) {
        throw new Error('network docs must include metrics.k8s.pod.network.io');
      }
      expect(firstDoc.fields[K8S_POD_NETWORK_IO]).toBe(firstIo);
      expect(match.fields[K8S_POD_NETWORK_IO]).toBe(secondIo);
      expect(secondIo).toBeGreaterThan(firstIo);
    }
  });

  it('concatenates cpu, memory, and network docs from metrics()', () => {
    const timestamp = 1_710_000_000_000;
    const pod = semconvPod('semconv-pod-0', 'semconv-host-0');
    const docs = pod.metrics().map((doc, i) => doc.timestamp(timestamp + i));

    expect(docs.map((doc) => doc.fields['metricset.name'])).toEqual([
      'cpu',
      'memory',
      'network',
      'network',
    ]);
    expect(docs.map((doc) => doc.fields['@timestamp'])).toEqual([
      timestamp,
      timestamp + 1,
      timestamp + 2,
      timestamp + 3,
    ]);
  });
});
