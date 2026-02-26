/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';

import { loadConnectorsThunk } from './load_connectors_thunk';
import type { ConnectorsResponse } from '../../../../connectors/model/types';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { setConnectors } from '../slice';

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
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should load connectors successfully for the first time', async () => {
    mockServices.http.get.mockResolvedValue(mockConnectorsResponse1);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.http.get).toHaveBeenCalledWith('/api/workflows/connectors');
    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes
    );
    expect(getWorkflowZodSchema).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      expect.any(Array)
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(mockConnectorsResponse1);
  });

  it('should load connectors and update schema when connectors have changed', async () => {
    // Set initial connectors in the store
    store.dispatch(setConnectors(mockConnectorsResponse1));

    // Load new connectors
    mockServices.http.get.mockResolvedValue(mockConnectorsResponse2);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.http.get).toHaveBeenCalledWith('/api/workflows/connectors');
    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse2.connectorTypes
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
    mockServices.http.get.mockResolvedValue(response);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.http.get).toHaveBeenCalledWith('/api/workflows/connectors');
    expect(addDynamicConnectorsToCache).not.toHaveBeenCalled();
    expect(getWorkflowZodSchema).not.toHaveBeenCalled();
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(response);
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Failed to fetch connectors' },
      message: 'Bad Request',
    };

    mockServices.http.get.mockRejectedValue(error);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Failed to fetch connectors',
      expect.objectContaining({
        title: expect.stringContaining('Failed to load connectors'),
      })
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/rejected');
    expect(result.payload).toBe('Failed to fetch connectors');
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    mockServices.http.get.mockRejectedValue(error);

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

    mockServices.http.get.mockRejectedValue(error);

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
    mockServices.http.get.mockResolvedValue(mockConnectorsResponse1);

    const result = await store.dispatch(loadConnectorsThunk());

    expect(addDynamicConnectorsToCache).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes
    );
    expect(getWorkflowZodSchema).toHaveBeenCalledWith(
      mockConnectorsResponse1.connectorTypes,
      expect.any(Array)
    );
    expect(result.type).toBe('detail/loadConnectorsThunk/fulfilled');
    expect(result.payload).toEqual(mockConnectorsResponse1);
  });
});
