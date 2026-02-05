/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SwimlaneServiceConfigurationSchema,
  SwimlaneSecretsConfigurationSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorParamsSchema,
  ConfigMapSchema,
  ConfigMappingSchema,
} from './v1';

describe('Swimlane Schema', () => {
  describe('ConfigMapSchema', () => {
    it('validates a valid config map', () => {
      expect(() =>
        ConfigMapSchema.parse({
          id: 'field-123',
          key: 'field_key',
          name: 'Field Name',
          fieldType: 'text',
        })
      ).not.toThrow();
    });

    it('throws when required fields are missing', () => {
      expect(() =>
        ConfigMapSchema.parse({
          id: 'field-123',
          key: 'field_key',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigMapSchema.parse({
          id: 'field-123',
          key: 'field_key',
          name: 'Field Name',
          fieldType: 'text',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ConfigMappingSchema', () => {
    it('validates empty object with default nulls', () => {
      const result = ConfigMappingSchema.parse({});
      expect(result.ruleNameConfig).toBeNull();
      expect(result.alertIdConfig).toBeNull();
      expect(result.caseIdConfig).toBeNull();
      expect(result.caseNameConfig).toBeNull();
      expect(result.commentsConfig).toBeNull();
      expect(result.severityConfig).toBeNull();
      expect(result.descriptionConfig).toBeNull();
    });

    it('validates with field mappings', () => {
      expect(() =>
        ConfigMappingSchema.parse({
          ruleNameConfig: {
            id: 'field-1',
            key: 'rule_name',
            name: 'Rule Name',
            fieldType: 'text',
          },
          severityConfig: {
            id: 'field-2',
            key: 'severity',
            name: 'Severity',
            fieldType: 'dropdown',
          },
        })
      ).not.toThrow();
    });
  });

  describe('SwimlaneServiceConfigurationSchema', () => {
    const validConfig = {
      apiUrl: 'https://swimlane.example.com',
      appId: 'app-123',
      connectorType: 'all',
      mappings: {},
    };

    it('validates a valid config', () => {
      expect(() => SwimlaneServiceConfigurationSchema.parse(validConfig)).not.toThrow();
    });

    it('validates all connector types', () => {
      const types = ['all', 'alerts', 'cases'];
      types.forEach((connectorType) => {
        expect(() =>
          SwimlaneServiceConfigurationSchema.parse({
            ...validConfig,
            connectorType,
          })
        ).not.toThrow();
      });
    });

    it('throws on invalid connector type', () => {
      expect(() =>
        SwimlaneServiceConfigurationSchema.parse({
          ...validConfig,
          connectorType: 'invalid',
        })
      ).toThrow();
    });

    it('throws when apiUrl is missing', () => {
      const { apiUrl, ...rest } = validConfig;
      expect(() => SwimlaneServiceConfigurationSchema.parse(rest)).toThrow();
    });

    it('throws when appId is missing', () => {
      const { appId, ...rest } = validConfig;
      expect(() => SwimlaneServiceConfigurationSchema.parse(rest)).toThrow();
    });

    it('validates with full mappings', () => {
      expect(() =>
        SwimlaneServiceConfigurationSchema.parse({
          ...validConfig,
          mappings: {
            ruleNameConfig: {
              id: '1',
              key: 'rule',
              name: 'Rule',
              fieldType: 'text',
            },
            alertIdConfig: {
              id: '2',
              key: 'alert',
              name: 'Alert',
              fieldType: 'text',
            },
          },
        })
      ).not.toThrow();
    });
  });

  describe('SwimlaneSecretsConfigurationSchema', () => {
    it('validates with apiToken', () => {
      expect(() =>
        SwimlaneSecretsConfigurationSchema.parse({
          apiToken: 'token-123',
        })
      ).not.toThrow();
    });

    it('throws when apiToken is missing', () => {
      expect(() => SwimlaneSecretsConfigurationSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SwimlaneSecretsConfigurationSchema.parse({
          apiToken: 'token-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExecutorSubActionPushParamsSchema', () => {
    it('validates with empty incident', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {},
        })
      ).not.toThrow();
    });

    it('applies default values', () => {
      const result = ExecutorSubActionPushParamsSchema.parse({
        incident: {},
      });
      expect(result.incident.alertId).toBeNull();
      expect(result.incident.ruleName).toBeNull();
      expect(result.incident.caseId).toBeNull();
      expect(result.incident.caseName).toBeNull();
      expect(result.incident.severity).toBeNull();
      expect(result.incident.description).toBeNull();
      expect(result.incident.externalId).toBeNull();
      expect(result.comments).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {
            alertId: 'alert-123',
            ruleName: 'Test Rule',
            caseId: 'case-456',
            caseName: 'Test Case',
            severity: 'high',
            description: 'Test description',
            externalId: 'ext-789',
          },
          comments: [{ comment: 'Test comment', commentId: 'comment-1' }],
        })
      ).not.toThrow();
    });

    it('validates comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchema.parse({
          incident: {},
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
          incident: {},
          comments: [{ comment: 'Missing commentId' }],
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
            incident: {},
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
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
