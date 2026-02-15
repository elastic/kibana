/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { ConnectorExecutor } from './connector_executor';

describe('ConnectorExecutor', () => {
  let mockActionsClient: jest.Mocked<ActionsClient>;
  let connectorExecutor: ConnectorExecutor;

  beforeEach(() => {
    mockActionsClient = {
      execute: jest.fn(),
      getAll: jest.fn(),
    } as unknown as jest.Mocked<ActionsClient>;

    connectorExecutor = new ConnectorExecutor(mockActionsClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const connectorType = 'http';
    const connectorName = 'test-connector';
    const inputs = { url: 'https://example.com', method: 'GET' };
    const spaceId = 'default';
    const abortController = new AbortController();

    it('should throw error if connector type is missing', async () => {
      await expect(
        connectorExecutor.execute('', connectorName, inputs, spaceId, abortController)
      ).rejects.toThrow('Connector type is required');
    });

    it('should execute connector with UUID connector ID', async () => {
      const connectorId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResult: ActionTypeExecutorResult<unknown> = {
        status: 'ok',
        actionId: connectorId,
        data: { status: 200 },
      };

      mockActionsClient.execute.mockResolvedValue(expectedResult);

      const result = await connectorExecutor.execute(
        connectorType,
        connectorId,
        inputs,
        spaceId,
        abortController
      );

      expect(mockActionsClient.execute).toHaveBeenCalledWith({
        actionId: connectorId,
        params: inputs,
        signal: abortController.signal,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should resolve connector ID by name and execute', async () => {
      const connectorId = 'resolved-connector-id';
      const name = 'my-connector';
      const expectedResult: ActionTypeExecutorResult<unknown> = {
        status: 'ok',
        actionId: connectorId,
        data: { status: 200 },
      };

      const mockConnectors: ConnectorWithExtraFindData[] = [
        {
          id: connectorId,
          name,
          actionTypeId: connectorType,
        } as ConnectorWithExtraFindData,
      ];

      mockActionsClient.getAll.mockResolvedValue(mockConnectors);
      mockActionsClient.execute.mockResolvedValue(expectedResult);

      const result = await connectorExecutor.execute(
        connectorType,
        name,
        inputs,
        spaceId,
        abortController
      );

      expect(mockActionsClient.getAll).toHaveBeenCalled();
      expect(mockActionsClient.execute).toHaveBeenCalledWith({
        actionId: connectorId,
        params: inputs,
        signal: abortController.signal,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw error if connector not found by name', async () => {
      mockActionsClient.getAll.mockResolvedValue([]);

      await expect(
        connectorExecutor.execute(connectorType, 'non-existent', inputs, spaceId, abortController)
      ).rejects.toThrow('Connector with name non-existent not found');
    });

    it('should pass abort signal to actions client', async () => {
      const connectorId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResult: ActionTypeExecutorResult<unknown> = {
        status: 'ok',
        actionId: connectorId,
        data: { status: 200 },
      };

      mockActionsClient.execute.mockResolvedValue(expectedResult);

      const testAbortController = new AbortController();
      await connectorExecutor.execute(
        connectorType,
        connectorId,
        inputs,
        spaceId,
        testAbortController
      );

      expect(mockActionsClient.execute).toHaveBeenCalledWith({
        actionId: connectorId,
        params: inputs,
        signal: testAbortController.signal,
      });
    });

    it('should handle abort signal during execution', async () => {
      const connectorId = '123e4567-e89b-12d3-a456-426614174000';
      const testAbortController = new AbortController();

      // Make execute take some time
      mockActionsClient.execute.mockImplementation(
        () =>
          new Promise<ActionTypeExecutorResult<unknown>>((resolve) => {
            setTimeout(() => {
              resolve({
                status: 'ok',
                actionId: connectorId,
                data: { status: 200 },
              });
            }, 100);
          })
      );

      const executePromise = connectorExecutor.execute(
        connectorType,
        connectorId,
        inputs,
        spaceId,
        testAbortController
      );

      // Abort before execution completes
      testAbortController.abort();

      await expect(executePromise).rejects.toThrow(
        `"${connectorId}" with type "${connectorType}" was aborted`
      );
    });
  });
});
