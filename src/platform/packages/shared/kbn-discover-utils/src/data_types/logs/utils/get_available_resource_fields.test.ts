/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAvailableResourceFields } from './get_available_resource_fields';
import type { ResourceFields } from '../../..';

describe('getAvailableResourceFields', () => {
  it('should return available fields', () => {
    const fields = getAvailableResourceFields({
      'service.name': 'yes',
      'container.name': 'yes',
      'host.name': 'yes',
      'k8s.cluster.name': 'yes',
      'k8s.namespace.name': 'yes',
      'k8s.pod.name': 'yes',
      'k8s.cronjob.name': 'yes',
    });
    expect(fields).toEqual([
      'service.name',
      'container.name',
      'host.name',
      'k8s.cluster.name',
      'k8s.namespace.name',
      'k8s.pod.name',
      'k8s.cronjob.name',
    ]);
  });

  it('should ignore empty fields', () => {
    const fields = getAvailableResourceFields({
      'service.name': '',
    });
    expect(fields).toEqual([]);
  });

  it('should ignore unknown fields', () => {
    const fields = getAvailableResourceFields({
      unknown: 'no',
    } as ResourceFields);
    expect(fields).toEqual([]);
  });

  it('should return first available field from each group', () => {
    const fields = getAvailableResourceFields({
      'service.name': 'yes',
      'container.name': 'no',
      'kubernetes.container.name': 'yes', // higher priority than `container.name`
      'host.name': 'no',
      'kubernetes.node.name': 'yes', // higher priority than `host.name`
      'k8s.cluster.name': 'no',
      'orchestrator.cluster.name': 'yes', // higher priority than `k8s.cluster.name`
      'k8s.namespace.name': 'no',
      'kubernetes.namespace': 'yes', // higher priority than `k8s.namespace.name`
      'k8s.pod.name': 'no',
      'kubernetes.pod.name': 'yes', // higher priority than `k8s.pod.name`
      'k8s.cronjob.name': 'no',
      'kubernetes.deployment.name': 'yes', // higher priority than `k8s.cronjob.name`
    });
    expect(fields).toEqual([
      'service.name',
      'kubernetes.container.name',
      'kubernetes.node.name',
      'orchestrator.cluster.name',
      'kubernetes.namespace',
      'kubernetes.pod.name',
      'kubernetes.deployment.name',
    ]);
  });
});
