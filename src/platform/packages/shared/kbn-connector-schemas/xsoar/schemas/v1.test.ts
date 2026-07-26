/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ConfigSchema,
  SecretsSchema,
  XSOARPlaybooksActionParamsSchema,
  XSOARPlaybooksObjectSchema,
  XSOARPlaybooksActionResponseSchema,
  XSOARRunActionParamsSchema,
  XSOARRunActionResponseSchema,
  ExecutorParamsSchema,
} from './v1';

describe('XSOAR Schema', () => {
  describe('ConfigSchema', () => {
    it('validates with url', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://xsoar.example.com',
        })
      ).not.toThrow();
    });

    it('throws when url is missing', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://xsoar.example.com',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('SecretsSchema', () => {
    it('validates with apiKey only', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: 'api-key-123',
        })
      ).not.toThrow();
    });

    it('validates with apiKey and apiKeyID', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: 'api-key-123',
          apiKeyID: 'key-id-456',
        })
      ).not.toThrow();
    });

    it('applies default null for apiKeyID', () => {
      const result = SecretsSchema.parse({
        apiKey: 'api-key-123',
      });
      expect(result.apiKeyID).toBeNull();
    });

    it('throws when apiKey is missing', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });

    it('accepts null for apiKeyID', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: 'api-key-123',
          apiKeyID: null,
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: 'api-key-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('XSOARPlaybooksActionParamsSchema', () => {
    it('is null', () => {
      expect(XSOARPlaybooksActionParamsSchema).toBeNull();
    });
  });

  describe('XSOARPlaybooksObjectSchema', () => {
    it('validates a valid playbook', () => {
      expect(() =>
        XSOARPlaybooksObjectSchema.parse({
          id: 'playbook-123',
          name: 'Test Playbook',
        })
      ).not.toThrow();
    });

    it('throws when id is missing', () => {
      expect(() =>
        XSOARPlaybooksObjectSchema.parse({
          name: 'Test Playbook',
        })
      ).toThrow();
    });

    it('throws when name is missing', () => {
      expect(() =>
        XSOARPlaybooksObjectSchema.parse({
          id: 'playbook-123',
        })
      ).toThrow();
    });
  });

  describe('XSOARPlaybooksActionResponseSchema', () => {
    it('validates with playbooks array', () => {
      expect(() =>
        XSOARPlaybooksActionResponseSchema.parse({
          playbooks: [
            { id: 'pb-1', name: 'Playbook 1' },
            { id: 'pb-2', name: 'Playbook 2' },
          ],
        })
      ).not.toThrow();
    });

    it('validates with empty playbooks array', () => {
      expect(() =>
        XSOARPlaybooksActionResponseSchema.parse({
          playbooks: [],
        })
      ).not.toThrow();
    });
  });

  describe('XSOARRunActionParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        XSOARRunActionParamsSchema.parse({
          name: 'Test Incident',
          createInvestigation: true,
          severity: 3,
        })
      ).not.toThrow();
    });

    it('applies default values', () => {
      const result = XSOARRunActionParamsSchema.parse({
        name: 'Test Incident',
        createInvestigation: true,
        severity: 3,
      });
      expect(result.playbookId).toBeNull();
      expect(result.isRuleSeverity).toBe(false);
      expect(result.body).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        XSOARRunActionParamsSchema.parse({
          name: 'Test Incident',
          playbookId: 'playbook-123',
          createInvestigation: true,
          severity: 3,
          isRuleSeverity: true,
          body: '{"key": "value"}',
        })
      ).not.toThrow();
    });

    it('throws when name is missing', () => {
      expect(() =>
        XSOARRunActionParamsSchema.parse({
          createInvestigation: true,
          severity: 3,
        })
      ).toThrow();
    });

    it('throws when createInvestigation is missing', () => {
      expect(() =>
        XSOARRunActionParamsSchema.parse({
          name: 'Test',
          severity: 3,
        })
      ).toThrow();
    });

    it('throws when severity is missing', () => {
      expect(() =>
        XSOARRunActionParamsSchema.parse({
          name: 'Test',
          createInvestigation: true,
        })
      ).toThrow();
    });

    it('coerces severity to number', () => {
      const result = XSOARRunActionParamsSchema.parse({
        name: 'Test',
        createInvestigation: true,
        severity: '3',
      });
      expect(result.severity).toBe(3);
    });

    it('throws on unknown properties', () => {
      expect(() =>
        XSOARRunActionParamsSchema.parse({
          name: 'Test',
          createInvestigation: true,
          severity: 3,
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('XSOARRunActionResponseSchema', () => {
    it('validates empty object', () => {
      expect(() => XSOARRunActionResponseSchema.parse({})).not.toThrow();
    });
  });

  describe('ExecutorParamsSchema', () => {
    it('validates playbooks action', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'getPlaybooks',
          subActionParams: null,
        })
      ).not.toThrow();
    });

    it('validates run action', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'run',
          subActionParams: {
            name: 'Test Incident',
            createInvestigation: true,
            severity: 3,
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'invalidAction',
          subActionParams: null,
        })
      ).toThrow();
    });

    it('throws when subAction is missing', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subActionParams: null,
        })
      ).toThrow();
    });

    it('throws when playbooks action has non-null params', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'playbooks',
          subActionParams: { key: 'value' },
        })
      ).toThrow();
    });
  });
});
