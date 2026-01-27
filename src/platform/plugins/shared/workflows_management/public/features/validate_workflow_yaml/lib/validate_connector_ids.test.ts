/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';
import { validateConnectorIds } from './validate_connector_ids';
import type { ConnectorIdItem } from '../model/types';

describe('validateConnectorIds', () => {
  const mockConnectorInstance = {
    id: 'slack-connector-1',
    name: 'My Slack Connector',
    isPreconfigured: false,
    isDeprecated: false,
  };

  const mockConnectorTypes: Record<string, ConnectorTypeInfo> = {
    slack: {
      actionTypeId: '.slack',
      displayName: 'Slack',
      instances: [mockConnectorInstance],
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      subActions: [],
    },
    'inference.unified_completion': {
      actionTypeId: '.gen-ai',
      displayName: 'OpenAI',
      instances: [
        {
          id: 'openai-connector-1',
          name: 'OpenAI Connector',
          isPreconfigured: false,
          isDeprecated: false,
        },
      ],
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'enterprise',
      subActions: [],
    },
  };

  const createConnectorIdItem = (overrides: Partial<ConnectorIdItem> = {}): ConnectorIdItem => ({
    id: 'test-id-1-2-3-4',
    connectorType: 'slack',
    type: 'connector-id',
    key: 'slack-connector-1', // Default to UUID
    startLineNumber: 5,
    startColumn: 10,
    endLineNumber: 5,
    endColumn: 30,
    yamlPath: ['steps', 0, 'connector-id'],
    ...overrides,
  });

  describe('when dynamicConnectorTypes is null', () => {
    it('should return error indicating dynamic connector types not found', () => {
      const connectorIdItems: ConnectorIdItem[] = [createConnectorIdItem()];

      const results = validateConnectorIds(connectorIdItems, null);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'connector-id-validation',
        severity: 'error',
        message: 'Dynamic connector types not found',
        owner: 'connector-id-validation',
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0,
        afterMessage: null,
        beforeMessage: null,
        hoverMessage: null,
      });
    });
  });

  describe('when connector is found by UUID', () => {
    it('should return valid result with beforeMessage containing connector name', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'slack-connector-1',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'test-id-1-2-3-4',
        severity: null,
        message: null,
        owner: 'connector-id-validation',
        startLineNumber: 5,
        startColumn: 10,
        endLineNumber: 5,
        endColumn: 30,
        beforeMessage: '✓ My Slack Connector',
        afterMessage: null,
        hoverMessage: null,
      });
    });
  });

  describe('when connector name is used instead of UUID', () => {
    it('should return error indicating UUID is required', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'My Slack Connector',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'test-id-1-2-3-4',
        severity: 'error',
        message: expect.stringContaining('UUID "My Slack Connector" not found'),
        owner: 'connector-id-validation',
        beforeMessage: null,
        afterMessage: null,
      });
    });
  });

  describe('when connector is not found', () => {
    it('should return error with message indicating connector not found', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'non-existent-connector',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'test-id-1-2-3-4',
        severity: 'error',
        message:
          'Slack connector UUID "non-existent-connector" not found. Add a new connector or choose an existing one',
        owner: 'connector-id-validation',
        startLineNumber: 5,
        startColumn: 10,
        endLineNumber: 5,
        endColumn: 30,
        afterMessage: null,
        beforeMessage: null,
        hoverMessage: null,
      });
    });

    it('should include connectors management link in hoverMessage when URL provided', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'non-existent-connector',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(
        connectorIdItems,
        mockConnectorTypes,
        'http://localhost:5601/app/management/connectors'
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        severity: 'error',
        hoverMessage:
          '[Open connectors management](http://localhost:5601/app/management/connectors)',
      });
    });

    it('should use connector displayName if available', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'non-existent-connector',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results[0].message).toContain('Slack connector UUID');
    });

    it('should use connector type as fallback if displayName not available', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'non-existent-connector',
          connectorType: 'unknown-type',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results[0].message).toContain('unknown-type connector UUID');
    });
  });

  describe('when connector key is a reference (template variable)', () => {
    it('should skip validation for keys that start with ${{ and end with }}', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: '${{vars.connector_id}}',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(0);
    });

    it('should skip validation for any reference-like pattern', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: '${{steps.previous.output.connectorId}}',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(0);
    });

    it('should validate connector that does not match reference pattern', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: '${some_var}', // Missing second { and not ending with }}
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
    });
  });

  describe('when connector key is null', () => {
    it('should attempt to validate and return error', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: null,
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
      expect(results[0].message).toContain('not found');
    });
  });

  describe('when handling multiple connector items', () => {
    it('should validate all connectors and return mixed results', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          id: 'test-id-1',
          key: 'slack-connector-1', // Valid UUID
          connectorType: 'slack',
          startLineNumber: 5,
        }),
        createConnectorIdItem({
          id: 'test-id-2',
          key: 'non-existent',
          connectorType: 'slack',
          startLineNumber: 10,
        }),
        createConnectorIdItem({
          id: 'test-id-3',
          key: 'openai-connector-1', // Valid UUID
          connectorType: 'inference.unified_completion',
          startLineNumber: 15,
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(3);

      // First connector should be valid
      expect(results[0]).toMatchObject({
        id: 'test-id-1',
        severity: null,
        message: null,
        beforeMessage: '✓ My Slack Connector',
      });

      // Second connector should have error
      expect(results[1]).toMatchObject({
        id: 'test-id-2',
        severity: 'error',
        message: expect.stringContaining('non-existent'),
      });

      // Third connector should be valid
      expect(results[2]).toMatchObject({
        id: 'test-id-3',
        severity: null,
        message: null,
        beforeMessage: '✓ OpenAI Connector',
      });
    });

    it('should skip reference connectors and validate others', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          id: 'test-id-1',
          key: 'slack-connector-1', // Valid UUID
          connectorType: 'slack',
        }),
        createConnectorIdItem({
          id: 'test-id-2',
          key: '${{vars.connector_id}}',
          connectorType: 'slack',
        }),
        createConnectorIdItem({
          id: 'test-id-3',
          key: 'non-existent',
          connectorType: 'slack',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(2); // Only 2 results, skipped the reference
      expect(results[0].id).toBe('test-id-1');
      expect(results[1].id).toBe('test-id-3');
    });
  });

  describe('when handling different connector types', () => {
    it('should validate connectors with sub-action types', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'openai-connector-1', // Valid UUID
          connectorType: 'inference.unified_completion',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        severity: null,
        message: null,
        beforeMessage: '✓ OpenAI Connector',
        afterMessage: null,
      });
    });

    it('should handle connector types without instances', () => {
      const emptyConnectorTypes: Record<string, ConnectorTypeInfo> = {
        email: {
          actionTypeId: '.email',
          displayName: 'Email',
          instances: [],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          subActions: [],
        },
      };

      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'some-email-connector',
          connectorType: 'email',
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, emptyConnectorTypes);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        severity: 'error',
        message:
          'Email connector UUID "some-email-connector" not found. Add a new connector or choose an existing one',
      });
    });
  });

  describe('when handling empty input', () => {
    it('should return empty array for empty connector items', () => {
      const results = validateConnectorIds([], mockConnectorTypes);

      expect(results).toHaveLength(0);
    });
  });

  describe('position information', () => {
    it('should preserve exact position information from connector items', () => {
      const connectorIdItems: ConnectorIdItem[] = [
        createConnectorIdItem({
          key: 'slack-connector-1', // Valid UUID
          connectorType: 'slack',
          startLineNumber: 10,
          startColumn: 5,
          endLineNumber: 10,
          endColumn: 25,
        }),
      ];

      const results = validateConnectorIds(connectorIdItems, mockConnectorTypes);

      expect(results[0]).toMatchObject({
        startLineNumber: 10,
        startColumn: 5,
        endLineNumber: 10,
        endColumn: 25,
      });
    });
  });
});
