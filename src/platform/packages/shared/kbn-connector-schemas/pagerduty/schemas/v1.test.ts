/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';

describe('PagerDuty Schema', () => {
  describe('ConfigSchema', () => {
    it('validates empty object', () => {
      expect(() => ConfigSchema.parse({})).not.toThrow();
    });

    it('applies default null for apiUrl', () => {
      const result = ConfigSchema.parse({});
      expect(result.apiUrl).toBeNull();
    });

    it('validates with apiUrl', () => {
      expect(() =>
        ConfigSchema.parse({
          apiUrl: 'https://events.pagerduty.com',
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({
          apiUrl: 'https://events.pagerduty.com',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('SecretsSchema', () => {
    it('validates with routingKey', () => {
      expect(() =>
        SecretsSchema.parse({
          routingKey: 'routing-key-123',
        })
      ).not.toThrow();
    });

    it('throws when routingKey is missing', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          routingKey: 'key',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => ParamsSchema.parse({})).not.toThrow();
    });

    it('validates trigger event', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'trigger',
          summary: 'Test alert',
          severity: 'critical',
        })
      ).not.toThrow();
    });

    it('validates resolve event with dedupKey', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'resolve',
          dedupKey: 'dedup-key-123',
        })
      ).not.toThrow();
    });

    it('validates acknowledge event with dedupKey', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'acknowledge',
          dedupKey: 'dedup-key-123',
        })
      ).not.toThrow();
    });

    it('throws when resolve event is missing dedupKey', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'resolve',
        })
      ).toThrow();
    });

    it('throws when acknowledge event is missing dedupKey', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'acknowledge',
        })
      ).toThrow();
    });

    it('validates all severity levels', () => {
      const severities = ['critical', 'error', 'warning', 'info'];
      severities.forEach((severity) => {
        expect(() =>
          ParamsSchema.parse({
            eventAction: 'trigger',
            severity,
          })
        ).not.toThrow();
      });
    });

    it('throws on invalid severity', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'trigger',
          severity: 'invalid',
        })
      ).toThrow();
    });

    it('validates dedupKey max length', () => {
      expect(() =>
        ParamsSchema.parse({
          dedupKey: 'a'.repeat(255),
        })
      ).not.toThrow();

      expect(() =>
        ParamsSchema.parse({
          dedupKey: 'a'.repeat(256),
        })
      ).toThrow();
    });

    it('validates summary max length', () => {
      expect(() =>
        ParamsSchema.parse({
          summary: 'a'.repeat(1024),
        })
      ).not.toThrow();

      expect(() =>
        ParamsSchema.parse({
          summary: 'a'.repeat(1025),
        })
      ).toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        ParamsSchema.parse({
          eventAction: 'trigger',
          dedupKey: 'dedup-123',
          summary: 'Test alert summary',
          source: 'Kibana',
          severity: 'warning',
          timestamp: '2023-01-01T00:00:00Z',
          component: 'test-component',
          group: 'test-group',
          class: 'test-class',
          links: [{ href: 'https://example.com', text: 'Example' }],
          customDetails: { key: 'value' },
        })
      ).not.toThrow();
    });

    it('validates valid ISO timestamp', () => {
      expect(() =>
        ParamsSchema.parse({
          timestamp: '2023-06-15T10:30:00Z',
        })
      ).not.toThrow();
    });

    it('throws on invalid timestamp format', () => {
      expect(() =>
        ParamsSchema.parse({
          timestamp: 'invalid-timestamp',
        })
      ).toThrow();
    });

    it('validates links structure', () => {
      expect(() =>
        ParamsSchema.parse({
          links: [
            { href: 'https://example.com', text: 'Link 1' },
            { href: 'https://example.org', text: 'Link 2' },
          ],
        })
      ).not.toThrow();
    });

    it('throws on invalid links structure', () => {
      expect(() =>
        ParamsSchema.parse({
          links: [{ href: 'https://example.com' }],
        })
      ).toThrow();
    });
  });
});
