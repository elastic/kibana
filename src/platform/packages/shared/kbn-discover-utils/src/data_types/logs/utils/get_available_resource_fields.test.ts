/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAvailableResourceFields,
  getAvailableResourceFieldsWithActualNames,
} from './get_available_resource_fields';
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

describe('getAvailableResourceFieldsWithActualNames', () => {
  it('should return available fields with their actual field names and values', () => {
    const doc = {
      'service.name': 'my-service',
      'container.name': 'my-container',
      'host.name': 'my-host',
    };

    const fields = getAvailableResourceFieldsWithActualNames(doc);
    expect(fields).toEqual([
      { field: 'service.name', value: 'my-service' },
      { field: 'container.name', value: 'my-container' },
      { field: 'host.name', value: 'my-host' },
    ]);
  });

  it('should check OTel fallbacks when ECS fields are not available', () => {
    const doc = {
      'other.field': 'value',
    };

    const fields = getAvailableResourceFieldsWithActualNames(doc);
    expect(fields).toEqual([]);
  });

  it('should handle mixed ECS fields', () => {
    const doc = {
      'service.name': 'ecs-service',
      'container.name': 'ecs-container',
    };

    const fields = getAvailableResourceFieldsWithActualNames(doc);
    expect(fields).toEqual([
      { field: 'service.name', value: 'ecs-service' },
      { field: 'container.name', value: 'ecs-container' },
    ]);
  });

  it('should include empty field values', () => {
    const doc = {
      'service.name': '',
      'host.name': 'my-host',
    };

    const fields = getAvailableResourceFieldsWithActualNames(doc);
    // Empty values are included, not filtered
    expect(fields).toEqual([
      { field: 'service.name', value: '' },
      { field: 'host.name', value: 'my-host' },
    ]);
  });

  it('should return empty array when no resource fields are available', () => {
    const doc = {
      'other.field': 'value',
      message: 'log message',
    };

    const fields = getAvailableResourceFieldsWithActualNames(doc);
    expect(fields).toEqual([]);
  });

  it('should handle array values without extracting first element', () => {
    const doc = {
      'service.name': ['service1', 'service2'],
    };

    const fields = getAvailableResourceFieldsWithActualNames(doc);
    // Arrays are not extracted, returned as-is
    expect(fields).toEqual([{ field: 'service.name', value: ['service1', 'service2'] }]);
  });
});
