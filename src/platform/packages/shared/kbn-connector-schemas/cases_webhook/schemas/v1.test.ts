/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExternalIncidentServiceConfigurationSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorParamsSchema,
} from './v1';

describe('Cases Webhook Schema', () => {
  describe('ExternalIncidentServiceConfigurationSchema', () => {
    const validConfig = {
      createIncidentUrl: 'https://api.example.com/incidents',
      createIncidentJson: '{"title": "{{title}}"}',
      createIncidentResponseKey: 'id',
      getIncidentUrl: 'https://api.example.com/incidents/{{{external.system.id}}}',
      getIncidentResponseExternalTitleKey: 'title',
      viewIncidentUrl: 'https://example.com/incidents/{{{external.system.id}}}',
      updateIncidentUrl: 'https://api.example.com/incidents/{{{external.system.id}}}',
      updateIncidentJson: '{"title": "{{title}}"}',
      hasAuth: true,
    };

    it('validates a valid config', () => {
      expect(() => ExternalIncidentServiceConfigurationSchema.parse(validConfig)).not.toThrow();
    });

    it('applies default values', () => {
      const result = ExternalIncidentServiceConfigurationSchema.parse(validConfig);
      expect(result.createIncidentMethod).toBe('post');
      expect(result.getIncidentMethod).toBe('get');
      expect(result.updateIncidentMethod).toBe('put');
    });

    it('accepts null for optional fields', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          ...validConfig,
          getIncidentJson: null,
          createCommentUrl: null,
          createCommentJson: null,
          headers: null,
        })
      ).not.toThrow();
    });

    it('throws when required fields are missing', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          createIncidentUrl: 'https://api.example.com/incidents',
        })
      ).toThrow();
    });

    it('validates method enums', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          ...validConfig,
          createIncidentMethod: 'invalid',
        })
      ).toThrow();
    });

    it('accepts valid HTTP methods', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          ...validConfig,
          createIncidentMethod: 'put',
          updateIncidentMethod: 'patch',
        })
      ).not.toThrow();
    });
  });

  describe('ExecutorSubActionPushParamsSchema', () => {
    const validParams = {
      incident: {
        title: 'Test Incident',
      },
    };

    it('validates with required fields', () => {
      expect(() => ExecutorSubActionPushParamsSchema.parse(validParams)).not.toThrow();
    });

    it('applies default values for optional fields', () => {
      const result = ExecutorSubActionPushParamsSchema.parse(validParams);
      expect(result.incident.description).toBeNull();
      expect(result.incident.id).toBeNull();
      expect(result.incident.severity).toBeNull();
      expect(result.incident.status).toBeNull();
      expect(result.incident.externalId).toBeNull();
      expect(result.incident.tags).toBeNull();
      expect(result.comments).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {
            title: 'Test Incident',
            description: 'Test Description',
            id: 'incident-123',
            severity: 'high',
            status: 'open',
            externalId: 'ext-123',
            tags: ['tag1', 'tag2'],
          },
          comments: [{ comment: 'Test comment', commentId: 'comment-1' }],
        })
      ).not.toThrow();
    });

    it('throws when title is missing', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {},
        })
      ).toThrow();
    });

    it('validates comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: { title: 'Test' },
          comments: [{ comment: 'Test', commentId: 'id' }],
        })
      ).not.toThrow();
    });

    it('throws on invalid comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: { title: 'Test' },
          comments: [{ comment: 'Test' }],
        })
      ).toThrow();
    });
  });

  describe('ExecutorParamsSchema', () => {
    it('validates pushToService action', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subAction: 'pushToService',
          subActionParams: {
            incident: { title: 'Test' },
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

    it('throws when subAction is missing', () => {
      expect(() =>
        ExecutorParamsSchema.parse({
          subActionParams: { incident: { title: 'Test' } },
        })
      ).toThrow();
    });
  });
});
