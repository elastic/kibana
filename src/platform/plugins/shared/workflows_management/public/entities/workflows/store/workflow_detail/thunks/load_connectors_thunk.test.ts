/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadConnectors } from '@kbn/inference-connectors';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { createMockWorkflowApi } from '@kbn/workflows-ui/mocks';

import { loadConnectorsThunk } from './load_connectors_thunk';
import { stepSchemas } from '../../../../../../common/step_schemas';
import type { ConnectorsResponse } from '../../../../connectors/model/types';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { setConnectors } from '../slice';

jest.mock('@kbn/inference-connectors', () => ({
  loadConnectors: jest.fn(),
}));

const mockLoadConnectors = loadConnectors as jest.MockedFunction<typeof loadConnectors>;

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => mockWorkflowApi),
}));

// Mock the schema functions
jest.mock('../../../../../../common/schema', () => ({
  addDynamicConnectorsToCache: jest.fn(),
  getWorkflowZodSchema: jest.fn(() => ({})),
}));

const { addDynamicConnectorsToCache, getWorkflowZodSchema } = jest.requireMock(
  '../../../../../../common/schema'
);

// Mock connector data
const mockConnectorType1 = {
  actionTypeId: 'test-action',
  enabled: true,
} as ConnectorTypeInfo;

const mockConnectorType2 = {
  actionTypeId: 'test-action-2',
  enabled: true,
} as ConnectorTypeInfo;

const mockConnectorsResponse1: ConnectorsResponse = {
  connectorTypes: {
    'test-action': mockConnectorType1,
  },
  totalConnectors: 1,
};

const mockConnectorsResponse2: ConnectorsResponse = {
  connectorTypes: {
    'test-action': mockConnectorType1,
    'test-action-2': mockConnectorType2,
  },
  totalConnectors: 2,
};

describe('loadConnectorsThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should load connectors successfully for the first time', async () => {
    mockWorkflowApi.getConnectors.mockResolvedValue(mockConnectorsResponse1);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      expect.any(Map)
    );
    expect(getWorkflowZodSchema).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      expect.any(Array)
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(mockConnectorsResponse1);
    expect(store.getState().detail.connectorsLoadState).toEqual({ status: 'ready' });
  });

  it('loads inference connectors declared by registered step features', async () => {
    jest.spyOn(stepSchemas, 'getAllRegisteredStepDefinitions').mockReturnValue([
      {
        editorHandlers: {
          config: {
            'connector-id': {
              connectorIdSelection: {
                connectorTypes: ['inference.unified_completion'],
                inferenceFeatureId: 'ai_summarize',
              },
            },
          },
        },
      } as never,
    ]);
    mockWorkflowApi.getConnectors.mockResolvedValue(mockConnectorsResponse1);
    mockLoadConnectors.mockResolvedValue([
      {
        id: 'endpoint-id',
        name: 'Inference endpoint',
        actionTypeId: '.inference',
        isPreconfigured: true,
        isDeprecated: false,
        isConnectorTypeDeprecated: false,
        isInferenceEndpoint: true,
        config: { taskType: 'completion' },
      } as never,
    ]);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockLoadConnectors).toHaveBeenCalledWith({
      http: mockServices.http,
      featureId: 'ai_summarize',
    });
    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      new Map([
        [
          'ai_summarize',
          [
            expect.objectContaining({
              id: 'endpoint-id',
              isInferenceEndpoint: true,
              config: { taskType: 'completion' },
            }),
          ],
        ],
      ])
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
  });

  it('fails connector loading when inference connector loading fails', async () => {
    jest.spyOn(stepSchemas, 'getAllRegisteredStepDefinitions').mockReturnValue([
      {
        editorHandlers: {
          config: {
            'connector-id': {
              connectorIdSelection: {
                connectorTypes: ['inference.unified_completion'],
                inferenceFeatureId: 'ai_summarize',
              },
            },
          },
        },
      } as never,
    ]);
    mockWorkflowApi.getConnectors.mockResolvedValue(mockConnectorsResponse1);
    mockLoadConnectors.mockRejectedValue(new Error('Inference request failed'));

    const result = await store.dispatch(loadConnectorsThunk());

    expect(result.type).toBe('detail/loadConnectorsThunk/rejected');
    expect(result.payload).toBe('Inference request failed');
  });

  it('tracks a connector refresh as loading until it completes', async () => {
    store.dispatch(setConnectors(mockConnectorsResponse1));
    let resolveRequest: ((value: ConnectorsResponse) => void) | undefined;
    mockWorkflowApi.getConnectors.mockReturnValue(
      new Promise<ConnectorsResponse>((resolve) => {
        resolveRequest = resolve;
      })
    );

    const resultPromise = store.dispatch(loadConnectorsThunk());

    expect(store.getState().detail.connectorsLoadState).toEqual({ status: 'loading' });
    if (!resolveRequest) {
      throw new Error('Connector request resolver was not initialized');
    }
    resolveRequest(mockConnectorsResponse1);
    await resultPromise;

    expect(store.getState().detail.connectorsLoadState).toEqual({ status: 'ready' });
  });

  it('should load connectors and update schema when connectors have changed', async () => {
    // Set initial connectors in the store
    store.dispatch(setConnectors(mockConnectorsResponse1));

    // Load new connectors
    mockWorkflowApi.getConnectors.mockResolvedValue(mockConnectorsResponse2);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse2.connectorTypes,
      expect.any(Map)
    );
    expect(getWorkflowZodSchema).toHaveBeenCalledWith(
      mockConnectorsResponse2.connectorTypes,
      expect.any(Array)
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(mockConnectorsResponse2);
  });

  it('should not regenerate schema when connectors have not changed', async () => {
    // Set initial connectors
    const response = mockConnectorsResponse1;
    store.dispatch(setConnectors(response));

    // Load the same connectors
    mockWorkflowApi.getConnectors.mockResolvedValue(response);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      response.connectorTypes,
      expect.any(Map)
    );
    expect(getWorkflowZodSchema).not.toHaveBeenCalled();
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(response);
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Failed to fetch connectors' },
      message: 'Bad Request',
    };

    mockWorkflowApi.getConnectors.mockRejectedValue(error);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Failed to fetch connectors',
      expect.objectContaining({
        title: expect.stringContaining('Failed to load connectors'),
      })
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/rejected');
    expect(result.payload).toBe('Failed to fetch connectors');
    expect(store.getState().detail.connectorsLoadState).toEqual({
      status: 'failed',
      error: 'Failed to fetch connectors',
    });
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    mockWorkflowApi.getConnectors.mockRejectedValue(error);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Network Error',
      expect.objectContaining({
        title: expect.stringContaining('Failed to load connectors'),
      })
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    mockWorkflowApi.getConnectors.mockRejectedValue(error);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Failed to load connectors',
      expect.objectContaining({
        title: expect.stringContaining('Failed to load connectors'),
      })
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/rejected');
    expect(result.payload).toBe('Failed to load connectors');
  });

  it('should update schema when connector types are removed', async () => {
    // Set initial connectors with 2 types
    store.dispatch(setConnectors(mockConnectorsResponse2));

    // Load connectors with only 1 type
    mockWorkflowApi.getConnectors.mockResolvedValue(mockConnectorsResponse1);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      expect.any(Map)
    );
    expect(getWorkflowZodSchema).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      expect.any(Array)
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(mockConnectorsResponse1);
  });
});
