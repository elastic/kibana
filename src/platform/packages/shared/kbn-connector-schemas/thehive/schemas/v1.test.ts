/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  TheHiveConfigSchema,
  TheHiveSecretsSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionCreateAlertParamsSchema,
  ExecutorParamsSchema,
} from './v1';

describe('TheHive Schema', () => {
  describe('TheHiveConfigSchema', () => {
    it('validates with url only', () => {
      expect(() =>
        TheHiveConfigSchema.parse({
          url: 'https://thehive.example.com',
        })
      ).not.toThrow();
    });

    it('applies default null for organisation', () => {
      const result = TheHiveConfigSchema.parse({
        url: 'https://thehive.example.com',
      });
      expect(result.organisation).toBeNull();
    });

    it('validates with organisation', () => {
      expect(() =>
        TheHiveConfigSchema.parse({
          url: 'https://thehive.example.com',
          organisation: 'org-123',
        })
      ).not.toThrow();
    });

    it('throws when url is missing', () => {
      expect(() => TheHiveConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TheHiveConfigSchema.parse({
          url: 'https://thehive.example.com',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('TheHiveSecretsSchema', () => {
    it('validates with apiKey', () => {
      expect(() =>
        TheHiveSecretsSchema.parse({
          apiKey: 'api-key-123',
        })
      ).not.toThrow();
    });

    it('throws when apiKey is missing', () => {
      expect(() => TheHiveSecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TheHiveSecretsSchema.parse({
          apiKey: 'api-key-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionPushParamsSchema', () => {
    const validIncident = {
      title: 'Test Incident',
      description: 'Test description',
    };

    it('validates with required fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: validIncident,
        })
      ).not.toThrow();
    });

    it('applies default values for optional fields', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: validIncident,
      });
      expect(result.incident.externalId).toBeNull();
      expect(result.incident.tags).toBeNull();
      expect(result.comments).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {
            title: 'Test Incident',
            description: 'Test description',
            externalId: 'ext-123',
            severity: 2,
            tlp: 2,
            tags: ['tag1', 'tag2'],
          },
          comments: [{ comment: 'Test comment', commentId: 'comment-1' }],
        })
      ).not.toThrow();
    });

    it('throws when title is missing', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: { description: 'Test' },
        })
      ).toThrow();
    });

    it('throws when description is missing', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: { title: 'Test' },
        })
      ).toThrow();
    });

    it('coerces severity to number', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: {
          ...validIncident,
          severity: '2',
        },
      });
      expect(result.incident.severity).toBe(2);
    });

    it('coerces tlp to number', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: {
          ...validIncident,
          tlp: '2',
        },
      });
      expect(result.incident.tlp).toBe(2);
    });
  });

  describe('ExecutorSubActionGetIncidentParamsSchema', () => {
    it('validates with externalId', () => {
      expect(() =>
        ExecutorSubActionGetIncidentParamsSchema.parse({
          externalId: 'incident-123',
        })
      ).not.toThrow();
    });

    it('throws when externalId is missing', () => {
      expect(() => ExecutorSubActionGetIncidentParamsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ExecutorSubActionGetIncidentParamsSchema.parse({
          externalId: 'incident-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionCreateAlertParamsSchema', () => {
    const validAlert = {
      title: 'Test Alert',
      description: 'Test description',
      type: 'external',
      source: 'Kibana',
      sourceRef: 'alert-123',
    };

    it('validates with required fields', () => {
      expect(() => ExecutorSubActionCreateAlertParamsSchema.parse(validAlert)).not.toThrow();
    });

    it('applies default values', () => {
      const result = ExecutorSubActionCreateAlertParamsSchema.parse(validAlert);
      expect(result.tags).toBeNull();
      expect(result.body).toBeNull();
      expect(result.isRuleSeverity).toBe(false);
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionCreateAlertParamsSchema.parse({
          ...validAlert,
          severity: 3,
          isRuleSeverity: true,
          tlp: 2,
          tags: ['security', 'malware'],
          body: '{"key": "value"}',
        })
      ).not.toThrow();
    });

    it('throws when title is missing', () => {
      const { title, ...rest } = validAlert;
      expect(() => ExecutorSubActionCreateAlertParamsSchema.parse(rest)).toThrow();
    });

    it('throws when type is missing', () => {
      const { type, ...rest } = validAlert;
      expect(() => ExecutorSubActionCreateAlertParamsSchema.parse(rest)).toThrow();
    });

    it('throws when source is missing', () => {
      const { source, ...rest } = validAlert;
      expect(() => ExecutorSubActionCreateAlertParamsSchema.parse(rest)).toThrow();
    });

    it('throws when sourceRef is missing', () => {
      const { sourceRef, ...rest } = validAlert;
      expect(() => ExecutorSubActionCreateAlertParamsSchema.parse(rest)).toThrow();
    });

    it('coerces severity to number', () => {
      const result = ExecutorSubActionCreateAlertParamsSchema.parse({
        ...validAlert,
        severity: '2',
      });
      expect(result.severity).toBe(2);
    });
  });

  describe('ExecutorParamsSchema', () => {
    it('validates pushToService action', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'pushToService',
          subActionParams: {
            incident: {
              title: 'Test',
              description: 'Test',
            },
          },
        })
      ).not.toThrow();
    });

    it('validates createAlert action', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'createAlert',
          subActionParams: {
            title: 'Test Alert',
            description: 'Test',
            type: 'external',
            source: 'Kibana',
            sourceRef: 'alert-123',
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'invalidAction',
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
