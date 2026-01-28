/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unflattenObject } from '@kbn/object-utils';
import { WorkflowTemplatingEngine } from './templating_engine';

/**
 * Integration tests for alert payload normalization through the templating engine.
 *
 * These tests verify that:
 * 1. Alert payloads with flat ECS fields are properly normalized
 * 2. Both new (recommended) dot notation and old (deprecated) bracket notation work
 * 3. Flat keys are preserved for backward compatibility
 * 4. Both syntaxes produce the same results
 *
 * Related to GitHub issue #250069: Alert Payload Structure Breaking Change in Workflows
 */
describe('Alert Payload Integration', () => {
  let templatingEngine: WorkflowTemplatingEngine;

  beforeEach(() => {
    templatingEngine = new WorkflowTemplatingEngine();
  });

  /**
   * Simulates the normalizeAlert function behavior for testing.
   * In production, this is done by normalizeAlert() in workflows_management.
   * This preserves flat keys for backward compatibility.
   */
  function createNormalizedAlert(rawAlert: Record<string, unknown>) {
    const expanded = unflattenObject(rawAlert);

    // Preserve original flat keys for backward compatibility (DEPRECATED)
    const flatKeys: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawAlert)) {
      if (key.includes('.') && key !== '_id' && key !== '_index') {
        flatKeys[key] = value;
      }
    }

    const kibanaAlert = (expanded.kibana as Record<string, unknown>)?.alert as
      | Record<string, unknown>
      | undefined;

    return {
      ...flatKeys, // Flat keys (deprecated, for backward compat)
      ...expanded, // Nested structure (new recommended access)
      id: rawAlert._id,
      index: rawAlert._index,
      status: kibanaAlert?.status,
      severity: kibanaAlert?.severity,
      reason: kibanaAlert?.reason,
      rule: kibanaAlert?.rule,
      _id: rawAlert._id,
      _index: rawAlert._index,
    };
  }

  /**
   * Creates a realistic raw alert payload as it comes from Elasticsearch.
   * This uses flat ECS-style field names.
   */
  function createRawAlertPayload() {
    return {
      _id: '7bdca0df-14a7-4500-9a4e-1732e594ef6b',
      _index: '.internal.alerts-stack.alerts-default-000002',
      '@timestamp': '2026-01-21T17:37:03.729Z',
      'kibana.alert.status': 'active',
      'kibana.alert.severity': 'high',
      'kibana.alert.reason': 'Latency threshold exceeded',
      'kibana.alert.rule.name': 'latency-threshold-alert-critical',
      'kibana.alert.rule.uuid': '3c515c5a-0f9a-441a-8a0f-e28208ad685a',
      'kibana.alert.rule.rule_type_id': '.es-query',
      'kibana.alert.rule.consumer': 'stackAlerts',
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.tags': ['critical', 'production'],
      'kibana.alert.rule.parameters': {
        esQuery: '{"query":{"bool":{"filter":[{"range":{"latency_ms":{"gte":800}}}]}}}',
        threshold: 800,
      },
      'service.name': 'payment-service',
      'host.name': 'prod-server-01',
    };
  }

  /**
   * Creates a complete event context as it would be passed to workflow execution.
   */
  function createAlertEventContext() {
    const rawAlert = createRawAlertPayload();
    const normalizedAlert = createNormalizedAlert(rawAlert);

    return {
      event: {
        alerts: [normalizedAlert],
        rule: {
          id: '3c515c5a-0f9a-441a-8a0f-e28208ad685a',
          name: 'latency-threshold-alert-critical',
          tags: ['critical', 'production'],
          consumer: 'stackAlerts',
          producer: 'stackAlerts',
          ruleTypeId: '.es-query',
        },
        ruleUrl:
          'https://kibana.example.com/app/management/insightsAndAlerting/triggersActions/rule/3c515c5a',
        spaceId: 'default',
      },
    };
  }

  describe('new recommended syntax (dot notation)', () => {
    it('should access alert id via convenience accessor', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].id }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('7bdca0df-14a7-4500-9a4e-1732e594ef6b');
    });

    it('should access alert status via convenience accessor', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].status }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('active');
    });

    it('should access rule name via convenience accessor', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].rule.name }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('latency-threshold-alert-critical');
    });

    it('should access rule parameters via convenience accessor', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].rule.parameters.threshold }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('800');
    });

    it('should access full nested path (kibana.alert.rule.name)', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].kibana.alert.rule.name }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('latency-threshold-alert-critical');
    });

    it('should access other ECS fields via nested path', () => {
      const context = createAlertEventContext();
      const template =
        'Service: {{ event.alerts[0].service.name }}, Host: {{ event.alerts[0].host.name }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('Service: payment-service, Host: prod-server-01');
    });

    it('should access event-level rule information', () => {
      const context = createAlertEventContext();
      const template = 'Rule: {{ event.rule.name }} ({{ event.rule.id }})';

      const result = templatingEngine.render(template, context);

      expect(result).toBe(
        'Rule: latency-threshold-alert-critical (3c515c5a-0f9a-441a-8a0f-e28208ad685a)'
      );
    });
  });

  describe('backward compatibility - bracket notation with flat keys', () => {
    /**
     * NOTE: For backward compatibility, normalizeAlert preserves original flat keys
     * alongside the expanded nested structure. This allows old bracket notation
     * syntax to continue working while users migrate to the new dot notation.
     *
     * The old syntax (bracket notation with dotted keys) is DEPRECATED and will
     * be removed in a future release after customer testing.
     */
    it('should work with dotted keys in brackets (backward compatibility)', () => {
      const context = createAlertEventContext();
      const template = "{{ event.alerts[0]['kibana.alert.rule.name'] }}";

      const result = templatingEngine.render(template, context);

      expect(result).toBe('latency-threshold-alert-critical');
    });

    it('should work with status via bracket notation', () => {
      const context = createAlertEventContext();
      const template = "{{ event.alerts[0]['kibana.alert.status'] }}";

      const result = templatingEngine.render(template, context);

      expect(result).toBe('active');
    });

    it('should work with severity via bracket notation', () => {
      const context = createAlertEventContext();
      const template = "{{ event.alerts[0]['kibana.alert.severity'] }}";

      const result = templatingEngine.render(template, context);

      expect(result).toBe('high');
    });

    it('should work with rule uuid via bracket notation', () => {
      const context = createAlertEventContext();
      const template = "{{ event.alerts[0]['kibana.alert.rule.uuid'] }}";

      const result = templatingEngine.render(template, context);

      expect(result).toBe('3c515c5a-0f9a-441a-8a0f-e28208ad685a');
    });

    it('should work with service name via bracket notation', () => {
      const context = createAlertEventContext();
      const template = "{{ event.alerts[0]['service.name'] }}";

      const result = templatingEngine.render(template, context);

      expect(result).toBe('payment-service');
    });

    it('should work with simple bracket notation for existing keys', () => {
      const context = createAlertEventContext();
      // This works because 'id' is a real key on the normalized alert
      const template = "{{ event.alerts[0]['id'] }}";

      const result = templatingEngine.render(template, context);

      expect(result).toBe('7bdca0df-14a7-4500-9a4e-1732e594ef6b');
    });
  });

  describe('both syntaxes produce same results', () => {
    it('should render same value for rule name using both syntaxes', () => {
      const context = createAlertEventContext();

      // Old syntax (deprecated, but still works for backward compatibility)
      const oldSyntax = templatingEngine.render(
        "{{ event.alerts[0]['kibana.alert.rule.name'] }}",
        context
      );

      // New syntax (recommended) - Full path:
      const newSyntaxFull = templatingEngine.render(
        '{{ event.alerts[0].kibana.alert.rule.name }}',
        context
      );

      // New syntax (recommended) - Convenience accessor:
      const newSyntaxConvenience = templatingEngine.render(
        '{{ event.alerts[0].rule.name }}',
        context
      );

      expect(oldSyntax).toBe('latency-threshold-alert-critical');
      expect(newSyntaxFull).toBe('latency-threshold-alert-critical');
      expect(newSyntaxConvenience).toBe('latency-threshold-alert-critical');
      expect(oldSyntax).toBe(newSyntaxFull);
      expect(oldSyntax).toBe(newSyntaxConvenience);
    });

    it('should render same value for status using both syntaxes', () => {
      const context = createAlertEventContext();

      const oldSyntax = templatingEngine.render(
        "{{ event.alerts[0]['kibana.alert.status'] }}",
        context
      );
      const newSyntax = templatingEngine.render(
        '{{ event.alerts[0].kibana.alert.status }}',
        context
      );
      const convenienceSyntax = templatingEngine.render('{{ event.alerts[0].status }}', context);

      expect(oldSyntax).toBe('active');
      expect(newSyntax).toBe('active');
      expect(convenienceSyntax).toBe('active');
      expect(oldSyntax).toBe(newSyntax);
      expect(oldSyntax).toBe(convenienceSyntax);
    });
  });

  describe('complex workflow template scenarios', () => {
    it('should render a complete alert notification message', () => {
      const context = createAlertEventContext();
      const template = `Alert '{{ event.alerts[0].rule.name }}' fired!
Status: {{ event.alerts[0].status }}
Severity: {{ event.alerts[0].severity }}
Service: {{ event.alerts[0].service.name }}
Host: {{ event.alerts[0].host.name }}
Alert ID: {{ event.alerts[0].id }}`;

      const result = templatingEngine.render(template, context);

      expect(result).toBe(`Alert 'latency-threshold-alert-critical' fired!
Status: active
Severity: high
Service: payment-service
Host: prod-server-01
Alert ID: 7bdca0df-14a7-4500-9a4e-1732e594ef6b`);
    });

    it('should work with json filter for rule parameters', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].rule.parameters | json }}';

      const result = templatingEngine.render(template, context);
      const parsed = JSON.parse(result);

      expect(parsed.threshold).toBe(800);
      expect(parsed.esQuery).toContain('latency_ms');
    });

    it('should work with json_parse filter for esQuery', () => {
      const context = createAlertEventContext();
      const template =
        '{% assign query = event.alerts[0].rule.parameters.esQuery | json_parse %}{{ query.query.bool.filter[0].range.latency_ms.gte }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('800');
    });

    it('should access rule tags array', () => {
      const context = createAlertEventContext();
      const template = '{{ event.alerts[0].rule.tags | join: ", " }}';

      const result = templatingEngine.render(template, context);

      expect(result).toBe('critical, production');
    });
  });

  describe('edge cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const rawAlert = {
        _id: 'test-id',
        _index: '.alerts-test',
        'kibana.alert.status': 'active',
        'kibana.alert.rule.name': 'test-rule',
        'kibana.alert.rule.uuid': 'test-uuid',
        // No severity, reason, or other optional fields
      };
      const normalizedAlert = createNormalizedAlert(rawAlert);
      const context = {
        event: {
          alerts: [normalizedAlert],
          rule: { id: 'test-uuid', name: 'test-rule' },
        },
      };

      const template =
        'Status: {{ event.alerts[0].status }}, Severity: {{ event.alerts[0].severity }}';
      const result = templatingEngine.render(template, context);

      expect(result).toBe('Status: active, Severity: ');
    });

    it('should handle multiple alerts in the array', () => {
      const rawAlert1 = {
        _id: 'alert-1',
        _index: '.alerts-test',
        'kibana.alert.status': 'active',
        'kibana.alert.rule.name': 'rule-1',
      };
      const rawAlert2 = {
        _id: 'alert-2',
        _index: '.alerts-test',
        'kibana.alert.status': 'recovered',
        'kibana.alert.rule.name': 'rule-2',
      };

      const context = {
        event: {
          alerts: [createNormalizedAlert(rawAlert1), createNormalizedAlert(rawAlert2)],
        },
      };

      const template = 'First: {{ event.alerts[0].id }}, Second: {{ event.alerts[1].id }}';
      const result = templatingEngine.render(template, context);

      expect(result).toBe('First: alert-1, Second: alert-2');
    });
  });
});
