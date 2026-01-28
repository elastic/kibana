/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeAlert } from './normalize_alert';

describe('normalizeAlert', () => {
  const createMockAlert = (overrides: Record<string, unknown> = {}) => ({
    _id: 'test-alert-id',
    _index: '.internal.alerts-stack.alerts-default-000001',
    ...overrides,
  });

  it('should expand dotted field names to nested objects', () => {
    const alert = createMockAlert({
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'test-rule',
      'kibana.alert.rule.uuid': 'rule-uuid-123',
    });

    const normalized = normalizeAlert(alert as any);

    // Verify nested structure is created
    expect(normalized.kibana?.alert?.status).toBe('active');
    expect(normalized.kibana?.alert?.rule?.name).toBe('test-rule');
    expect(normalized.kibana?.alert?.rule?.uuid).toBe('rule-uuid-123');
  });

  it('should add convenience accessors at the root level', () => {
    const alert = createMockAlert({
      'kibana.alert.status': 'active',
      'kibana.alert.severity': 'high',
      'kibana.alert.reason': 'Threshold exceeded',
      'kibana.alert.rule.name': 'test-rule',
      'kibana.alert.rule.uuid': 'rule-uuid-123',
      'kibana.alert.rule.parameters': { threshold: 100 },
    });

    const normalized = normalizeAlert(alert as any);

    // Verify convenience accessors
    expect(normalized.id).toBe('test-alert-id');
    expect(normalized.index).toBe('.internal.alerts-stack.alerts-default-000001');
    expect(normalized.status).toBe('active');
    expect(normalized.severity).toBe('high');
    expect(normalized.reason).toBe('Threshold exceeded');
    expect(normalized.rule?.name).toBe('test-rule');
    expect(normalized.rule?.uuid).toBe('rule-uuid-123');
    expect(normalized.rule?.parameters).toEqual({ threshold: 100 });
  });

  it('should handle deeply nested dotted fields', () => {
    const alert = createMockAlert({
      'kibana.alert.rule.parameters.esQuery': '{"query":{"bool":{}}}',
      'service.name': 'payment-service',
      'host.name': 'server-01',
    });

    const normalized = normalizeAlert(alert as any);

    // Verify deeply nested fields
    expect(normalized.kibana?.alert?.rule?.parameters?.esQuery).toBe('{"query":{"bool":{}}}');
    expect((normalized as Record<string, unknown>).service).toEqual({ name: 'payment-service' });
    expect((normalized as Record<string, unknown>).host).toEqual({ name: 'server-01' });
  });

  it('should handle null values in alert fields', () => {
    const alert = createMockAlert({
      'kibana.alert.severity': null,
      'kibana.alert.reason': null,
    });

    const normalized = normalizeAlert(alert as any);

    expect(normalized.kibana?.alert?.severity).toBeNull();
    expect(normalized.kibana?.alert?.reason).toBeNull();
  });

  it('should handle arrays in alert fields', () => {
    const alert = createMockAlert({
      'kibana.alert.rule.tags': ['critical', 'production'],
    });

    const normalized = normalizeAlert(alert as any);

    expect(normalized.kibana?.alert?.rule?.tags).toEqual(['critical', 'production']);
    expect(normalized.rule?.tags).toEqual(['critical', 'production']);
  });

  it('should handle a realistic ES query alert payload', () => {
    const alert = createMockAlert({
      _id: '7bdca0df-14a7-4500-9a4e-1732e594ef6b',
      _index: '.internal.alerts-stack.alerts-default-000002',
      'kibana.alert.status': 'active',
      'kibana.alert.rule.name': 'latency-threshold-alert-critical',
      'kibana.alert.rule.uuid': '3c515c5a-0f9a-441a-8a0f-e28208ad685a',
      'kibana.alert.rule.rule_type_id': '.es-query',
      'kibana.alert.rule.consumer': 'stackAlerts',
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.tags': ['critical'],
      'kibana.alert.rule.parameters': {
        esQuery: '{"query":{"bool":{"filter":[{"range":{"latency_ms":{"gte":800}}}]}}}',
      },
      '@timestamp': '2026-01-21T17:37:03.729Z',
    });

    const normalized = normalizeAlert(alert as any);

    // Test the access patterns from the GitHub issue
    expect(normalized.id).toBe('7bdca0df-14a7-4500-9a4e-1732e594ef6b');
    expect(normalized.rule?.name).toBe('latency-threshold-alert-critical');
    expect(normalized.rule?.parameters?.esQuery).toBe(
      '{"query":{"bool":{"filter":[{"range":{"latency_ms":{"gte":800}}}]}}}'
    );

    // Also verify the full nested path works
    expect(normalized.kibana?.alert?.rule?.name).toBe('latency-threshold-alert-critical');
    expect(normalized.kibana?.alert?.status).toBe('active');
  });

  it('should handle alerts without kibana.alert fields gracefully', () => {
    const alert = createMockAlert({
      'some.other.field': 'value',
    });

    const normalized = normalizeAlert(alert as any);

    // Should not throw, convenience accessors should be undefined
    expect(normalized.id).toBe('test-alert-id');
    expect(normalized.status).toBeUndefined();
    expect(normalized.rule).toBeUndefined();
    expect((normalized as Record<string, unknown>).some).toEqual({ other: { field: 'value' } });
  });

  describe('backward compatibility - flat keys preservation', () => {
    it('should preserve original flat keys for backward compatibility', () => {
      const alert = createMockAlert({
        'kibana.alert.status': 'active',
        'kibana.alert.rule.name': 'test-rule',
        'kibana.alert.rule.uuid': 'rule-uuid-123',
        'service.name': 'payment-service',
      });

      const normalized = normalizeAlert(alert as any);

      // Verify flat keys are preserved (for old bracket notation syntax)
      expect((normalized as Record<string, unknown>)['kibana.alert.status']).toBe('active');
      expect((normalized as Record<string, unknown>)['kibana.alert.rule.name']).toBe('test-rule');
      expect((normalized as Record<string, unknown>)['kibana.alert.rule.uuid']).toBe(
        'rule-uuid-123'
      );
      expect((normalized as Record<string, unknown>)['service.name']).toBe('payment-service');
    });

    it('should preserve flat keys alongside nested structure', () => {
      const alert = createMockAlert({
        'kibana.alert.rule.name': 'test-rule',
      });

      const normalized = normalizeAlert(alert as any);

      // Both access patterns should work:
      // 1. Old syntax (flat key) - for backward compatibility
      expect((normalized as Record<string, unknown>)['kibana.alert.rule.name']).toBe('test-rule');
      // 2. New syntax (nested) - recommended
      expect(normalized.kibana?.alert?.rule?.name).toBe('test-rule');
      // 3. Convenience accessor
      expect(normalized.rule?.name).toBe('test-rule');
    });
  });
});
