/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { connectorsSpecs } from '@kbn/connector-specs';
import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { actionTypeRegistryMock } from '../test_utils/action_type_registry.mock';
import type { ActionTypeModel } from '../types';
import { useActionTypeModel } from './use_action_type_model';

const WORKFLOWS_CONNECTOR_FEATURE_ID = 'workflows';

const mockDocLinks = docLinksServiceMock.createStartContract();

describe('useActionTypeModel', () => {
  let actionTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;
  let queryClient: QueryClient;
  let mockHttp: { get: jest.Mock };
  let mockUiSettings: { get: jest.Mock };

  const mockActionTypeModel: ActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    id: 'test-connector',
  });

  const mockSpecResponse = {
    metadata: {
      id: 'spec-connector',
      display_name: 'Spec Connector',
      description: 'A spec-based connector',
      minimum_license: 'basic',
      supported_feature_ids: ['alerting'],
    },
    schema: serializeConnectorSpec(connectorsSpecs.AlienVaultOTXConnector).schema as Record<
      string,
      unknown
    >,
  };

  const createWrapper = (): FC<PropsWithChildren<unknown>> => {
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { get: jest.fn() };
    mockUiSettings = { get: jest.fn().mockReturnValue(true) };
    actionTypeRegistry = actionTypeRegistryMock.create();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns null when actionType is null', async () => {
    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: undefined,
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual({
      actionTypeModel: null,
      isLoading: false,
      error: null,
      refetch: expect.any(Function),
    });
  });

  it('returns registered model synchronously for stack connectors', async () => {
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(mockActionTypeModel);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: 'test-connector',
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    // Should return immediately without loading
    expect(result.current.actionTypeModel).toBe(mockActionTypeModel);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // Should not call HTTP get for registered connectors
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('fetches spec from API for spec-based connectors not in registry', async () => {
    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue(mockSpecResponse);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: 'spec-connector',
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify API was called
    expect(mockHttp.get).toHaveBeenCalledWith(
      '/internal/actions/connector_types/spec-connector/spec',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    // Verify model is returned
    expect(result.current.actionTypeModel).not.toBeNull();
    expect(result.current.actionTypeModel?.id).toBe('spec-connector');
    expect(result.current.error).toBeNull();
  });

  it('surfaces error when connector spec schema cannot be parsed', async () => {
    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue({
      ...mockSpecResponse,
      schema: {
        type: 'object',
        properties: {
          config: { type: 'object', properties: {} },
          secrets: { type: 'string' },
        },
      },
    });

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: 'spec-connector',
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(
      'Failed to parse connector spec schema for "spec-connector"'
    );
    expect(result.current.actionTypeModel).toBeNull();
  });

  it('handles fetch errors correctly', async () => {
    actionTypeRegistry.has.mockReturnValue(false);
    const fetchError = new Error('Failed to fetch spec');
    mockHttp.get.mockRejectedValue(fetchError);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: 'spec-connector',
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(fetchError);
    expect(result.current.actionTypeModel).toBeNull();
  });

  it('transforms spec response into ActionTypeModel with correct properties', async () => {
    actionTypeRegistry.has.mockReturnValue(false);
    mockHttp.get.mockResolvedValue(mockSpecResponse);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: 'spec-connector',
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: mockUiSettings as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const model = result.current.actionTypeModel;
    expect(model).not.toBeNull();
    expect(model?.id).toBe('spec-connector');
    expect(model?.actionTypeTitle).toBe('Spec Connector');
    expect(model?.selectMessage).toBe('A spec-based connector');
    expect(model?.isExperimental).toBe(false);
    expect(model?.actionConnectorFields).toBeDefined();
    expect(model?.actionParamsFields).toBeDefined();
    expect(model?.validateParams).toBeDefined();
  });

  it('exposes getHideInUi on fetched spec model using uiSettings for workflows-only connectors', async () => {
    const workflowsSpecResponse = {
      ...mockSpecResponse,
      metadata: {
        ...mockSpecResponse.metadata,
        id: 'workflows-spec-connector',
        supported_feature_ids: [WORKFLOWS_CONNECTOR_FEATURE_ID],
      },
    };

    const uiSettingsGet = jest.fn().mockReturnValue(false);
    mockHttp.get.mockResolvedValue(workflowsSpecResponse);

    actionTypeRegistry.has.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useActionTypeModel({
          actionTypeRegistry,
          actionTypeId: 'workflows-spec-connector',
          http: mockHttp as any,
          docLinks: mockDocLinks,
          uiSettings: { get: uiSettingsGet } as any,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.actionTypeModel?.getHideInUi?.([])).toBe(true);
    expect(uiSettingsGet).toHaveBeenCalledWith('workflows:ui:enabled', true);
  });
});
