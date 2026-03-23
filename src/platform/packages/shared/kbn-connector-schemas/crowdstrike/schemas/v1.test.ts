/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CrowdstrikeConfigSchema,
  CrowdstrikeSecretsSchema,
  CrowdstrikeHostActionsParamsSchema,
  CrowdstrikeGetAgentsParamsSchema,
  CrowdstrikeActionParamsSchema,
  CrowdstrikeInitRTRParamsSchema,
} from './v1';

describe('Crowdstrike Schema', () => {
  describe('CrowdstrikeConfigSchema', () => {
    it('validates a valid config', () => {
      expect(() =>
        CrowdstrikeConfigSchema.parse({
          url: 'https://api.crowdstrike.com',
        })
      ).not.toThrow();
    });

    it('throws when url is missing', () => {
      expect(() => CrowdstrikeConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        CrowdstrikeConfigSchema.parse({
          url: 'https://api.crowdstrike.com',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('does not throw on empty url', () => {
      expect(() =>
        CrowdstrikeConfigSchema.parse({
          url: '',
        })
      ).not.toThrow();
    });

    it('throws on undefined url', () => {
      expect(() =>
        CrowdstrikeConfigSchema.parse({
          url: undefined,
        })
      ).toThrow();
    });
  });

  describe('CrowdstrikeSecretsSchema', () => {
    it('validates valid secrets', () => {
      expect(() =>
        CrowdstrikeSecretsSchema.parse({
          clientId: 'client-123',
          clientSecret: 'secret-456',
        })
      ).not.toThrow();
    });

    it('throws when clientId is missing', () => {
      expect(() =>
        CrowdstrikeSecretsSchema.parse({
          clientSecret: 'secret-456',
        })
      ).toThrow();
    });

    it('throws when clientSecret is missing', () => {
      expect(() =>
        CrowdstrikeSecretsSchema.parse({
          clientId: 'client-123',
        })
      ).toThrow();
    });

    it('throws on empty object', () => {
      expect(() => CrowdstrikeSecretsSchema.parse({})).toThrow();
    });
  });

  describe('CrowdstrikeHostActionsParamsSchema', () => {
    it('validates contain command', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'contain',
          ids: ['host-123', 'host-456'],
        })
      ).not.toThrow();
    });

    it('validates lift_containment command', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'lift_containment',
          ids: ['host-123'],
        })
      ).not.toThrow();
    });

    it('validates with optional fields', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'contain',
          ids: ['host-123'],
          alertIds: ['alert-1'],
          comment: 'Test comment',
          actionParameters: { key: 'value' },
        })
      ).not.toThrow();
    });

    it('throws on invalid command', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'invalid',
          ids: ['host-123'],
        })
      ).toThrow();
    });

    it('throws when ids is missing', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'contain',
        })
      ).toThrow();
    });

    it('does not throw when ids is empty array', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'contain',
          ids: [],
        })
      ).not.toThrow();
    });

    it('throws when ids is undefined', () => {
      expect(() =>
        CrowdstrikeHostActionsParamsSchema.parse({
          command: 'contain',
          ids: undefined,
        })
      ).toThrow();
    });
  });

  describe('CrowdstrikeGetAgentsParamsSchema', () => {
    it('validates with ids array', () => {
      expect(() =>
        CrowdstrikeGetAgentsParamsSchema.parse({
          ids: ['agent-123', 'agent-456'],
        })
      ).not.toThrow();
    });

    it('throws when ids is missing', () => {
      expect(() => CrowdstrikeGetAgentsParamsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        CrowdstrikeGetAgentsParamsSchema.parse({
          ids: ['agent-123'],
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('CrowdstrikeActionParamsSchema', () => {
    it('validates hostActions subAction', () => {
      expect(() =>
        CrowdstrikeActionParamsSchema.parse({
          subAction: 'hostActions',
          subActionParams: {
            command: 'contain',
            ids: ['host-123'],
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        CrowdstrikeActionParamsSchema.parse({
          subAction: 'invalid',
          subActionParams: {},
        })
      ).toThrow();
    });
  });

  describe('CrowdstrikeInitRTRParamsSchema', () => {
    it('validates with endpoint_ids', () => {
      expect(() =>
        CrowdstrikeInitRTRParamsSchema.parse({
          endpoint_ids: ['endpoint-123'],
        })
      ).not.toThrow();
    });

    it('throws when endpoint_ids is missing', () => {
      expect(() => CrowdstrikeInitRTRParamsSchema.parse({})).toThrow();
    });

    it('validates with multiple endpoint_ids', () => {
      expect(() =>
        CrowdstrikeInitRTRParamsSchema.parse({
          endpoint_ids: ['endpoint-1', 'endpoint-2', 'endpoint-3'],
        })
      ).not.toThrow();
    });
  });
});
