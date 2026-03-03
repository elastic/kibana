/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import { resolveConnectorId } from './resolve_connector_id';

describe('resolveConnectorId', () => {
  let mockInferencePlugin: jest.Mocked<InferenceServerStart>;
  let mockKibanaRequest: jest.Mocked<KibanaRequest>;

  // Helper function to create mock connectors
  const createMockConnector = (partial: Partial<InferenceConnector>): InferenceConnector => ({
    type: InferenceConnectorType.OpenAI,
    name: 'Mock Connector',
    connectorId: 'mock-connector-id',
    config: {},
    capabilities: {},
    ...partial,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock KibanaRequest
    mockKibanaRequest = {} as jest.Mocked<KibanaRequest>;

    // Mock InferenceServerStart - need to use 'any' to allow null/undefined returns
    // that don't match the strict type signature but are handled by the implementation
    mockInferencePlugin = {
      getDefaultConnector: jest.fn(),
      getConnectorList: jest.fn(),
    } as any;
  });

  describe('when nameOrId is undefined', () => {
    it('should return the default connector ID when a default connector exists', async () => {
      const defaultConnectorId = 'default-connector-123';
      const mockConnector = createMockConnector({
        connectorId: defaultConnectorId,
      });
      mockInferencePlugin.getDefaultConnector.mockResolvedValue(mockConnector);

      const result = await resolveConnectorId(undefined, mockInferencePlugin, mockKibanaRequest);

      expect(mockInferencePlugin.getDefaultConnector).toHaveBeenCalledWith(mockKibanaRequest);
      expect(result).toBe(defaultConnectorId);
    });

    it('should throw an error when no default connector is configured', async () => {
      // Using type assertion since the implementation handles null but types don't allow it
      mockInferencePlugin.getDefaultConnector.mockResolvedValue(null as any);

      await expect(
        resolveConnectorId(undefined, mockInferencePlugin, mockKibanaRequest)
      ).rejects.toThrow('No default AI connector configured');

      expect(mockInferencePlugin.getDefaultConnector).toHaveBeenCalledWith(mockKibanaRequest);
    });

    it('should throw an error when default connector is undefined', async () => {
      // Using type assertion since the implementation handles undefined but types don't allow it
      mockInferencePlugin.getDefaultConnector.mockResolvedValue(undefined as any);

      await expect(
        resolveConnectorId(undefined, mockInferencePlugin, mockKibanaRequest)
      ).rejects.toThrow('No default AI connector configured');

      expect(mockInferencePlugin.getDefaultConnector).toHaveBeenCalledWith(mockKibanaRequest);
    });
  });

  describe('when nameOrId is empty string', () => {
    it('should return the default connector ID when nameOrId is empty string', async () => {
      const defaultConnectorId = 'default-connector-123';
      const mockConnector = createMockConnector({
        connectorId: defaultConnectorId,
      });
      mockInferencePlugin.getDefaultConnector.mockResolvedValue(mockConnector);

      const result = await resolveConnectorId('', mockInferencePlugin, mockKibanaRequest);

      expect(mockInferencePlugin.getDefaultConnector).toHaveBeenCalledWith(mockKibanaRequest);
      expect(result).toBe(defaultConnectorId);
    });
  });

  describe('when nameOrId is a connector ID', () => {
    it('should return the connector ID when it exists in the connector list', async () => {
      const connectorId = 'openai-gpt4-connector-id';
      const mockConnectors = [
        createMockConnector({
          name: 'OpenAI GPT-4',
          connectorId,
        }),
      ];
      mockInferencePlugin.getConnectorList.mockResolvedValue(mockConnectors);

      const result = await resolveConnectorId(connectorId, mockInferencePlugin, mockKibanaRequest);

      expect(mockInferencePlugin.getConnectorList).toHaveBeenCalledWith(mockKibanaRequest);
      expect(result).toBe(connectorId);
    });

    it('should throw an error when connector ID is not found', async () => {
      const nonExistentId = 'non-existent-connector-id';
      const mockConnectors = [
        createMockConnector({
          name: 'OpenAI GPT-4',
          connectorId: 'openai-gpt4-connector-id',
        }),
      ];
      mockInferencePlugin.getConnectorList.mockResolvedValue(mockConnectors);

      await expect(
        resolveConnectorId(nonExistentId, mockInferencePlugin, mockKibanaRequest)
      ).rejects.toThrow(
        `AI Connector '${nonExistentId}' not found. Available AI connectors: OpenAI GPT-4 (ID: openai-gpt4-connector-id)`
      );
    });
  });

  describe('when nameOrId is a connector name', () => {
    const mockConnectors = [
      createMockConnector({
        name: 'OpenAI GPT-4',
        connectorId: 'openai-gpt4-connector-id',
      }),
      createMockConnector({
        name: 'Azure OpenAI',
        connectorId: 'azure-openai-connector-id',
      }),
      createMockConnector({
        name: 'Anthropic Claude',
        connectorId: 'anthropic-claude-connector-id',
      }),
    ];

    beforeEach(() => {
      mockInferencePlugin.getConnectorList.mockResolvedValue(mockConnectors);
    });

    it('should return the connector ID when connector name exists', async () => {
      const connectorName = 'OpenAI GPT-4';
      const expectedConnectorId = 'openai-gpt4-connector-id';

      const result = await resolveConnectorId(
        connectorName,
        mockInferencePlugin,
        mockKibanaRequest
      );

      expect(mockInferencePlugin.getConnectorList).toHaveBeenCalledWith(mockKibanaRequest);
      expect(result).toBe(expectedConnectorId);
    });

    it('should perform case-sensitive name matching', async () => {
      const connectorName = 'openai gpt-4'; // Different case

      await expect(
        resolveConnectorId(connectorName, mockInferencePlugin, mockKibanaRequest)
      ).rejects.toThrow(
        `AI Connector 'openai gpt-4' not found. Available AI connectors: OpenAI GPT-4 (ID: openai-gpt4-connector-id), Azure OpenAI (ID: azure-openai-connector-id), Anthropic Claude (ID: anthropic-claude-connector-id)`
      );
    });

    it('should throw an error when connector name is not found', async () => {
      const nonExistentName = 'Non-existent Connector';

      await expect(
        resolveConnectorId(nonExistentName, mockInferencePlugin, mockKibanaRequest)
      ).rejects.toThrow(
        `AI Connector 'Non-existent Connector' not found. Available AI connectors: OpenAI GPT-4 (ID: openai-gpt4-connector-id), Azure OpenAI (ID: azure-openai-connector-id), Anthropic Claude (ID: anthropic-claude-connector-id)`
      );

      expect(mockInferencePlugin.getConnectorList).toHaveBeenCalledWith(mockKibanaRequest);
    });

    it('should handle empty connector list gracefully', async () => {
      mockInferencePlugin.getConnectorList.mockResolvedValue([]);
      const connectorName = 'Any Connector';

      await expect(
        resolveConnectorId(connectorName, mockInferencePlugin, mockKibanaRequest)
      ).rejects.toThrow('No AI connectors found.');
    });
  });

  describe('edge cases', () => {
    it('should handle connector list with duplicate names (first match wins)', async () => {
      const duplicateConnectors = [
        createMockConnector({ name: 'Duplicate Connector', connectorId: 'first-connector-id' }),
        createMockConnector({ name: 'Duplicate Connector', connectorId: 'second-connector-id' }),
      ];

      mockInferencePlugin.getConnectorList.mockResolvedValue(duplicateConnectors);

      const result = await resolveConnectorId(
        'Duplicate Connector',
        mockInferencePlugin,
        mockKibanaRequest
      );

      expect(result).toBe('first-connector-id');
    });
  });
});
