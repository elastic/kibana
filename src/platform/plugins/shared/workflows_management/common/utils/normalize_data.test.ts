/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeData } from './normalize_data';

describe('normalizeData', () => {
  it('should expand dotted field names to nested objects', () => {
    const data = {
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'test-rule',
      'kibana.alert.rule.uuid': 'rule-uuid-123',
    };

    const normalized = normalizeData(data);

    // Verify nested structure is created
    expect((normalized as Record<string, unknown>).kibana).toBeDefined();
    expect(
      ((normalized as Record<string, unknown>).kibana as Record<string, unknown>)?.alert
    ).toBeDefined();
    expect(
      (
        ((normalized as Record<string, unknown>).kibana as Record<string, unknown>)
          ?.alert as Record<string, unknown>
      )?.status
    ).toBe('active');
    expect(
      (
        (
          ((normalized as Record<string, unknown>).kibana as Record<string, unknown>)
            ?.alert as Record<string, unknown>
        )?.rule as Record<string, unknown>
      )?.name
    ).toBe('test-rule');
  });

  it('should preserve original flat keys for backward compatibility', () => {
    const data = {
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'test-rule',
      'service.name': 'payment-service',
    };

    const normalized = normalizeData(data);

    // Verify flat keys are preserved
    expect((normalized as Record<string, unknown>)['kibana.alert.status']).toBe('active');
    expect((normalized as Record<string, unknown>)['kibana.alert.rule.name']).toBe('test-rule');
    expect((normalized as Record<string, unknown>)['service.name']).toBe('payment-service');
  });

  it('should preserve flat keys alongside nested structure', () => {
    const data = {
      'kibana.alert.rule.name': 'test-rule',
    };

    const normalized = normalizeData(data);

    // Both access patterns should work:
    // 1. Old syntax (flat key) - for backward compatibility
    expect((normalized as Record<string, unknown>)['kibana.alert.rule.name']).toBe('test-rule');
    // 2. New syntax (nested) - recommended
    expect(
      (
        (
          ((normalized as Record<string, unknown>).kibana as Record<string, unknown>)
            ?.alert as Record<string, unknown>
        )?.rule as Record<string, unknown>
      )?.name
    ).toBe('test-rule');
  });

  it('should not preserve _id and _index as flat keys (handled separately)', () => {
    const data = {
      _id: 'test-id',
      _index: '.alerts-test',
      'kibana.alert.status': 'active',
    };

    const normalized = normalizeData(data);

    // _id and _index should be preserved but not as flat keys
    expect((normalized as Record<string, unknown>)._id).toBe('test-id');
    expect((normalized as Record<string, unknown>)._index).toBe('.alerts-test');

    // But they shouldn't be duplicated as flat keys
    // eslint-disable-next-line dot-notation
    expect((normalized as Record<string, unknown>)['_id']).toBe('test-id');
    // eslint-disable-next-line dot-notation
    expect((normalized as Record<string, unknown>)['_index']).toBe('.alerts-test');
  });

  it('should handle arrays recursively', () => {
    const data = {
      items: [
        {
          'service.name': 'service-1',
          'host.name': 'host-1',
        },
        {
          'service.name': 'service-2',
          'host.name': 'host-2',
        },
      ],
    };

    const normalized = normalizeData(data);

    const items = (normalized as Record<string, unknown>).items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);

    // First item
    expect(items[0]['service.name']).toBe('service-1');
    expect((items[0].service as Record<string, unknown>)?.name).toBe('service-1');
    expect(items[0]['host.name']).toBe('host-1');
    expect((items[0].host as Record<string, unknown>)?.name).toBe('host-1');

    // Second item
    expect(items[1]['service.name']).toBe('service-2');
    expect((items[1].service as Record<string, unknown>)?.name).toBe('service-2');
  });

  it('should handle nested objects recursively', () => {
    const data = {
      event: {
        'kibana.alert.status': 'active',
        'kibana.alert.rule.name': 'test-rule',
        nested: {
          'service.name': 'payment-service',
        },
      },
    };

    const normalized = normalizeData(data);

    const event = (normalized as Record<string, unknown>).event as Record<string, unknown>;
    expect(event['kibana.alert.status']).toBe('active');
    expect((event.kibana as Record<string, unknown>)?.alert).toBeDefined();

    const nested = event.nested as Record<string, unknown>;
    expect(nested['service.name']).toBe('payment-service');
    expect((nested.service as Record<string, unknown>)?.name).toBe('payment-service');
  });

  it('should handle objects without dotted keys', () => {
    const data = {
      name: 'test',
      value: 123,
      nested: {
        foo: 'bar',
      },
    };

    const normalized = normalizeData(data);

    expect((normalized as Record<string, unknown>).name).toBe('test');
    expect((normalized as Record<string, unknown>).value).toBe(123);
    expect(((normalized as Record<string, unknown>).nested as Record<string, unknown>)?.foo).toBe(
      'bar'
    );
  });

  it('should handle empty objects', () => {
    const data = {};

    const normalized = normalizeData(data);

    expect(Object.keys(normalized)).toHaveLength(0);
  });

  it('should handle mixed flat and nested keys', () => {
    const data = {
      'kibana.alert.status': 'active',
      regularKey: 'value',
      nested: {
        'service.name': 'payment-service',
        regularNestedKey: 'nested-value',
      },
    };

    const normalized = normalizeData(data);

    // Flat keys preserved
    expect((normalized as Record<string, unknown>)['kibana.alert.status']).toBe('active');
    expect((normalized as Record<string, unknown>).regularKey).toBe('value');

    // Nested structure created
    expect((normalized as Record<string, unknown>).kibana).toBeDefined();

    // Nested object also normalized
    const nested = (normalized as Record<string, unknown>).nested as Record<string, unknown>;
    expect(nested['service.name']).toBe('payment-service');
    expect((nested.service as Record<string, unknown>)?.name).toBe('payment-service');
    expect(nested.regularNestedKey).toBe('nested-value');
  });
});
