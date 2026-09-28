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
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '@kbn/actions-types';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { connectorsSpecs } from '@kbn/connector-specs';
import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { actionTypeRegistryMock } from '../test_utils/action_type_registry.mock';
import { useSpecActionTypeModels } from './use_spec_action_type_models';

const mockDocLinks = docLinksServiceMock.createStartContract();
const serializedSlack = serializeConnectorSpec(connectorsSpecs.Slack);

const slackWire = {
  metadata: {
    id: '.slack2',
    display_name: 'Slack (v2)',
    description: 'Slack',
    minimum_license: 'gold',
    supported_feature_ids: ['alerting'],
  },
  schema: serializedSlack.schema,
  actions: serializedSlack.actions,
  alerting: { default_action: 'sendMessage', message_field: 'text' },
  is_testable: true,
};

const specType = (id: string): ActionType =>
  ({
    id,
    name: id,
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: false,
    isDeprecated: false,
    source: ACTION_TYPE_SOURCES.spec,
  } as ActionType);

describe('useSpecActionTypeModels', () => {
  let queryClient: QueryClient;
  let mockHttp: { get: jest.Mock };
  let actionTypeRegistry: ReturnType<typeof actionTypeRegistryMock.create>;

  const createWrapper = (): FC<PropsWithChildren<unknown>> => {
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { get: jest.fn() };
    actionTypeRegistry = actionTypeRegistryMock.create();
    actionTypeRegistry.has.mockReturnValue(false);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('fetches only spec types missing from the registry and returns models', async () => {
    mockHttp.get.mockResolvedValue(slackWire);
    actionTypeRegistry.has.mockImplementation(
      (id: string) => id === '.email' || id === '.already-registered'
    );

    const { result } = renderHook(
      () =>
        useSpecActionTypeModels({
          http: mockHttp as never,
          docLinks: mockDocLinks,
          actionTypeRegistry,
          connectorTypes: [
            specType('.slack2'),
            { ...specType('.email'), source: ACTION_TYPE_SOURCES.stack },
            specType('.already-registered'),
          ],
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    expect(mockHttp.get.mock.calls[0][0]).toBe('/internal/actions/connector_types/.slack2/spec');
    expect(result.current.models).toHaveLength(1);
    expect(result.current.models[0].id).toBe('.slack2');
  });

  it('tolerates one failing fetch without blocking other models', async () => {
    mockHttp.get.mockImplementation(async (path: string) => {
      if (String(path).includes('.broken')) {
        throw new Error('boom');
      }
      return slackWire;
    });

    const { result } = renderHook(
      () =>
        useSpecActionTypeModels({
          http: mockHttp as never,
          docLinks: mockDocLinks,
          actionTypeRegistry,
          connectorTypes: [specType('.slack2'), specType('.broken')],
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models.map((model) => model.id)).toEqual(['.slack2']);
  });
});
