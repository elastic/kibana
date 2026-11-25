/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, ParamsSchema, SecretsSchema } from './v1';

describe('Rootly Alerts schemas', () => {
  describe('ConfigSchema', () => {
    it('validates a webhook URL', () => {
      expect(() =>
        ConfigSchema.parse({ webhookUrl: 'https://rootly.example.com/webhooks/generic' })
      ).not.toThrow();
    });

    it('throws when the webhook URL is missing or empty', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
      expect(() => ConfigSchema.parse({ webhookUrl: '' })).toThrow();
    });

    it('limits the length of the webhook URL', () => {
      const url = (length: number) => 'https://rootly.example.com/'.padEnd(length, 'a');
      expect(() => ConfigSchema.parse({ webhookUrl: url(2048) })).not.toThrow();
      expect(() => ConfigSchema.parse({ webhookUrl: url(2049) })).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({ webhookUrl: 'https://rootly.example.com', region: 'us' })
      ).toThrow();
    });
  });

  describe('SecretsSchema', () => {
    it('validates a secret', () => {
      expect(() => SecretsSchema.parse({ secret: 'abc' })).not.toThrow();
    });

    it('throws when the secret is missing or empty', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
      expect(() => SecretsSchema.parse({ secret: '' })).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() => SecretsSchema.parse({ secret: 'abc', apiKey: 'key' })).toThrow();
    });

    it('limits the length of the secret', () => {
      expect(() => SecretsSchema.parse({ secret: 'a'.repeat(1024) })).not.toThrow();
      expect(() => SecretsSchema.parse({ secret: 'a'.repeat(1025) })).toThrow();
    });
  });

  describe('ParamsSchema', () => {
    const trigger = { event: 'trigger', dedupKey: 'rule:alert', title: 'Error count is high' };

    it('validates a trigger with only a title', () => {
      expect(() => ParamsSchema.parse({ title: 'Error count is high' })).not.toThrow();
    });

    it('validates a trigger with all params', () => {
      expect(() =>
        ParamsSchema.parse({
          ...trigger,
          description: 'Error count is 42 in the last 5 mins',
          url: 'https://kibana.example.com/app/rules/rule/abc',
          urgency: 'High',
          match: { on: 'catalog', catalog: 'regions', value: 'eu-west' },
          labels: [{ key: 'environment', value: 'production' }],
          customDetails: '{"runbook":"https://example.com/runbook"}',
          ruleId: 'abc',
          ruleName: 'Error count',
          alertId: 'checkout-api',
          space: 'default',
          evaluationTime: '2026-11-17T14:02:11Z',
        })
      ).not.toThrow();
    });

    it('throws when a trigger has no title', () => {
      expect(() => ParamsSchema.parse({ event: 'trigger', dedupKey: 'rule:alert' })).toThrow(
        /Title is required/
      );
      expect(() => ParamsSchema.parse({ ...trigger, title: '   ' })).toThrow(/Title is required/);
      expect(() => ParamsSchema.parse({})).toThrow(/Title is required/);
    });

    it('throws when a resolve has no dedupKey', () => {
      const event = 'resolve';
      expect(() => ParamsSchema.parse({ event })).toThrow(/DedupKey is required/);
      expect(() => ParamsSchema.parse({ event, dedupKey: '  ' })).toThrow(/DedupKey is required/);
      expect(() => ParamsSchema.parse({ event, dedupKey: 'rule:alert' })).not.toThrow();
    });

    it('ignores the trigger params on a resolve', () => {
      expect(() =>
        ParamsSchema.parse({
          event: 'resolve',
          dedupKey: 'rule:alert',
          title: '',
          customDetails: '{',
        })
      ).not.toThrow();
    });

    it('throws on an acknowledge', () => {
      expect(() => ParamsSchema.parse({ event: 'acknowledge', dedupKey: 'rule:alert' })).toThrow();
    });

    it('validates a trigger with a target', () => {
      expect(() =>
        ParamsSchema.parse({ ...trigger, target: { type: 'escalation_policy', id: 'abc-123' } })
      ).not.toThrow();
    });

    it('throws when a target has no ID', () => {
      expect(() => ParamsSchema.parse({ ...trigger, target: { type: 'service' } })).toThrow(
        /Target ID is required/
      );
      expect(() =>
        ParamsSchema.parse({ ...trigger, target: { type: 'service', id: '  ' } })
      ).toThrow(/Target ID is required/);
    });

    it('throws when customDetails is not a JSON object', () => {
      expect(() => ParamsSchema.parse({ ...trigger, customDetails: 'nope' })).toThrow(
        /Custom details must be a valid JSON object/
      );
      expect(() => ParamsSchema.parse({ ...trigger, customDetails: '[1,2]' })).toThrow();
      expect(() => ParamsSchema.parse({ ...trigger, customDetails: 'null' })).toThrow();
      expect(() => ParamsSchema.parse({ ...trigger, customDetails: '{"a":1}' })).not.toThrow();
    });

    it('does not limit the length of the dedupKey or of values rendered from rule variables', () => {
      const long = 'a'.repeat(100000);
      expect(() =>
        ParamsSchema.parse({
          event: 'trigger',
          dedupKey: long,
          title: long,
          description: long,
          url: long,
          urgency: long,
          match: { on: 'service', value: long },
          customDetails: JSON.stringify({ details: long }),
          labels: [{ key: 'environment', value: long }],
          ruleId: long,
          ruleName: long,
          alertId: long,
          space: long,
          evaluationTime: long,
        })
      ).not.toThrow();
      expect(() => ParamsSchema.parse({ event: 'resolve', dedupKey: long })).not.toThrow();
    });

    it('limits the length of the catalog slug and the target ID', () => {
      const parse = (params: object) => () => ParamsSchema.parse({ ...trigger, ...params });
      expect(
        parse({ match: { on: 'catalog', catalog: 'a'.repeat(1024), value: 'b' } })
      ).not.toThrow();
      expect(parse({ match: { on: 'catalog', catalog: 'a'.repeat(1025), value: 'b' } })).toThrow();
      expect(parse({ target: { type: 'service', id: 'a'.repeat(512) } })).not.toThrow();
      expect(parse({ target: { type: 'service', id: 'a'.repeat(513) } })).toThrow();
    });

    it('limits the number of labels and the length of a label name', () => {
      const labels = (count: number) =>
        Array.from({ length: count }, (_, i) => ({ key: `label-${i}`, value: 'x' }));
      expect(() => ParamsSchema.parse({ ...trigger, labels: labels(100) })).not.toThrow();
      expect(() => ParamsSchema.parse({ ...trigger, labels: labels(101) })).toThrow();
      expect(() =>
        ParamsSchema.parse({ ...trigger, labels: [{ key: 'a'.repeat(1025), value: 'x' }] })
      ).toThrow();
    });

    it('throws on an unknown event, match type, target type or property', () => {
      expect(() => ParamsSchema.parse({ ...trigger, event: 'snooze' })).toThrow();
      expect(() => ParamsSchema.parse({ ...trigger, match: { on: 'schedule' } })).toThrow();
      expect(() =>
        ParamsSchema.parse({ ...trigger, target: { type: 'schedule', id: 'abc-123' } })
      ).toThrow();
      expect(() => ParamsSchema.parse({ ...trigger, severity: 'critical' })).toThrow();
    });
  });
});
