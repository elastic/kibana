/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { discoverServiceMock as mockDiscoverServices } from '../__mocks__/services';
import { useConfirmPersistencePrompt } from './use_confirm_persistence_prompt';
import { getDiscoverStateMock } from '../__mocks__/discover_state.mock';

jest.mock('./show_confirm_panel', () => {
  return {
    showConfirmPanel: ({ onConfirm }: { onConfirm: () => void }) => onConfirm(),
  };
});

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: 'mock-time-field-name',
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as DataView;

describe('useConfirmPersistencePrompt', () => {
  it('should save data view correctly', async () => {
    mockDiscoverServices.dataViews.createAndSave = jest.fn().mockResolvedValue(mockDataView);
    const stateContainer = getDiscoverStateMock({});
    const hook = renderHook(
      (d: DataView) =>
        useConfirmPersistencePrompt(() => Promise.resolve(mockDataView), stateContainer),
      {
        initialProps: mockDataView,
        wrapper: ({ children }) => (
          <KibanaContextProvider services={mockDiscoverServices}>{children}</KibanaContextProvider>
        ),
      }
    );

    const result = await hook.result.current.openConfirmSavePrompt(mockDataView);

    expect(mockDiscoverServices.dataViews.createAndSave).toHaveBeenCalled();
    expect(result).toEqual(mockDataView);
  });

  it('should show error toast if creation failed', async () => {
    const stateContainer = getDiscoverStateMock({});
    mockDiscoverServices.dataViews.createAndSave = jest
      .fn()
      .mockRejectedValue(new Error('failed to save'));
    const hook = renderHook(
      (d: DataView) =>
        useConfirmPersistencePrompt(() => Promise.resolve(mockDataView), stateContainer),
      {
        initialProps: mockDataView,
        wrapper: ({ children }) => (
          <KibanaContextProvider services={mockDiscoverServices}>{children}</KibanaContextProvider>
        ),
      }
    );

    try {
      await hook.result.current.openConfirmSavePrompt(mockDataView);
    } catch (e) {
      expect(mockDiscoverServices.toastNotifications.addDanger).toHaveBeenCalled();
      expect(e.message).toEqual('failed to save');
    }
  });
});
