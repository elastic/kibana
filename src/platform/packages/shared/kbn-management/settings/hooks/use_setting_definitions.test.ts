/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type {
  IUiSettingsMetadataClient,
  UiSettingsMetadataState,
} from '@kbn/core-ui-settings-browser';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { UseSettingDefinitionsParams } from './use_setting_definitions';
import { useSettingDefinitions } from './use_setting_definitions';

const definitions: UiSettingsMetadataState = {
  'test:string': { name: 'String setting', type: 'string', value: 'default' },
};

const createMetadataClient = (): jest.Mocked<IUiSettingsMetadataClient> => ({
  getAll: jest.fn().mockResolvedValue(definitions),
});

const renderDefinitions = (initialProps: UseSettingDefinitionsParams) =>
  renderHook((props: UseSettingDefinitionsParams) => useSettingDefinitions(props), {
    initialProps,
  });

describe('useSettingDefinitions', () => {
  it('reports loading until the definitions for the scope have loaded', async () => {
    const metadataClient = createMetadataClient();

    const { result } = renderDefinitions({ metadataClient, scope: 'global' });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.definitions).toEqual({});
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.definitions).toEqual(definitions);
    expect(result.current.loadError).toBeUndefined();
    expect(metadataClient.getAll).toHaveBeenCalledTimes(1);
    expect(metadataClient.getAll).toHaveBeenCalledWith('global');
  });

  it("doesn't fetch, and isn't loading, when disabled", async () => {
    const metadataClient = createMetadataClient();

    const { result } = renderDefinitions({ metadataClient, scope: 'global', isEnabled: false });

    expect(result.current.isLoading).toBe(false);
    await act(async () => {});
    expect(result.current.definitions).toEqual({});
    expect(result.current.loadError).toBeUndefined();
    expect(metadataClient.getAll).not.toHaveBeenCalled();
  });

  it('exposes the error, and shows loading instead of it while a retry is in flight', async () => {
    const metadataClient = createMetadataClient();
    metadataClient.getAll.mockRejectedValueOnce(new Error('Request failed'));
    let resolveRetry: (value: UiSettingsMetadataState) => void = () => {};
    metadataClient.getAll.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = resolve;
      })
    );

    const { result } = renderDefinitions({ metadataClient, scope: 'namespace' });

    await waitFor(() => expect(result.current.loadError).toEqual(new Error('Request failed')));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.definitions).toEqual({});

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.loadError).toBeUndefined();

    await act(async () => {
      resolveRetry(definitions);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadError).toBeUndefined();
    expect(result.current.definitions).toEqual(definitions);
    expect(metadataClient.getAll).toHaveBeenCalledTimes(2);
  });

  it('keeps the loaded definitions, without loading, while they are fetched again', async () => {
    const metadataClient = createMetadataClient();
    const { result, rerender } = renderDefinitions({ metadataClient, scope: 'namespace' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const nextClient = createMetadataClient();
    let resolveNext: (value: UiSettingsMetadataState) => void = () => {};
    nextClient.getAll.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNext = resolve;
      })
    );
    rerender({ metadataClient: nextClient, scope: 'namespace' });

    await waitFor(() => expect(nextClient.getAll).toHaveBeenCalled());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.definitions).toEqual(definitions);

    const nextDefinitions = { ...definitions, 'test:other': { name: 'Other', value: 1 } };
    await act(async () => {
      resolveNext(nextDefinitions);
    });
    expect(result.current.definitions).toEqual(nextDefinitions);
  });

  it('ignores a response for a scope that is no longer requested', async () => {
    const metadataClient = createMetadataClient();
    const resolvers: Partial<Record<UiSettingsScope, (value: UiSettingsMetadataState) => void>> =
      {};
    metadataClient.getAll.mockImplementation(
      (scope) =>
        new Promise((resolve) => {
          resolvers[scope] = resolve;
        })
    );
    const globalDefinitions = { 'test:global': { name: 'Global setting', value: true } };

    const { result, rerender } = renderDefinitions({ metadataClient, scope: 'namespace' });
    rerender({ metadataClient, scope: 'global' });
    await waitFor(() => expect(resolvers.global).toBeDefined());

    await act(async () => {
      resolvers.global?.(globalDefinitions);
    });
    await act(async () => {
      resolvers.namespace?.(definitions);
    });

    expect(result.current.definitions).toEqual(globalDefinitions);
  });
});
