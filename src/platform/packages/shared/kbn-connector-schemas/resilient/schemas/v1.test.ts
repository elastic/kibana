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
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetIncidentTypesParamsSchema,
  ExecutorSubActionGetSeverityParamsSchema,
} from './v1';

describe('Resilient Schema', () => {
  describe('ExternalIncidentServiceConfigurationSchema', () => {
    it('validates a valid config', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          apiUrl: 'https://api.resilient.ibm.com',
          orgId: 'org-123',
        })
      ).not.toThrow();
    });

    it('throws when apiUrl is missing', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          orgId: 'org-123',
        })
      ).toThrow();
    });

    it('throws when orgId is missing', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          apiUrl: 'https://api.resilient.ibm.com',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ExternalIncidentServiceConfigurationSchema.parse({
          apiUrl: 'https://api.resilient.ibm.com',
          orgId: 'org-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExternalIncidentServiceSecretConfigurationSchema', () => {
    it('validates valid secrets', () => {
      expect(() =>
        ExternalIncidentServiceSecretConfigurationSchema.parse({
          apiKeyId: 'key-id-123',
          apiKeySecret: 'secret-456',
        })
      ).not.toThrow();
    });

    it('throws when apiKeyId is missing', () => {
      expect(() =>
        ExternalIncidentServiceSecretConfigurationSchema.parse({
          apiKeySecret: 'secret-456',
        })
      ).toThrow();
    });

    it('throws when apiKeySecret is missing', () => {
      expect(() =>
        ExternalIncidentServiceSecretConfigurationSchema.parse({
          apiKeyId: 'key-id-123',
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionPushParamsSchema', () => {
    const validIncident = {
      name: 'Test Incident',
    };

    it('validates with required fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: validIncident,
        })
      ).not.toThrow();
    });

    it('applies default values', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: validIncident,
      });
      expect(result.incident.description).toBeNull();
      expect(result.incident.externalId).toBeNull();
      expect(result.incident.incidentTypes).toBeNull();
      expect(result.incident.severityCode).toBeNull();
      expect(result.incident.additionalFields).toBeNull();
      expect(result.comments).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {
            name: 'Test Incident',
            description: 'Test description',
            externalId: 'ext-123',
            incidentTypes: [1, 2, 3],
            severityCode: 50,
            additionalFields: { customField: 'value' },
          },
          comments: [{ comment: 'Test comment', commentId: 'comment-1' }],
        })
      ).not.toThrow();
    });

    it('throws when name is missing', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {},
        })
      ).toThrow();
    });

    it('coerces incidentTypes to numbers', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: {
          name: 'Test',
          incidentTypes: ['1', '2', '3'],
        },
      });
      expect(result.incident.incidentTypes).toEqual([1, 2, 3]);
    });

    it('coerces severityCode to number', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: {
          name: 'Test',
          severityCode: '50',
        },
      });
      expect(result.incident.severityCode).toBe(50);
    });

    it('validates comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: validIncident,
          comments: [
            { comment: 'Comment 1', commentId: 'id1' },
            { comment: 'Comment 2', commentId: 'id2' },
          ],
        })
      ).not.toThrow();
    });

    it('throws on invalid comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: validIncident,
          comments: [{ comment: 'Missing commentId' }],
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionCommonFieldsParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => ExecutorSubActionCommonFieldsParamsSchema.parse({})).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ExecutorSubActionCommonFieldsParamsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionGetIncidentTypesParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => ExecutorSubActionGetIncidentTypesParamsSchema.parse({})).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ExecutorSubActionGetIncidentTypesParamsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionGetSeverityParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => ExecutorSubActionGetSeverityParamsSchema.parse({})).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ExecutorSubActionGetSeverityParamsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });
});
