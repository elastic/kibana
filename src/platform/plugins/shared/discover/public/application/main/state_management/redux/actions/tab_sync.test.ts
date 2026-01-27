/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectTabRuntimeState } from '..';
import { getTabRuntimeStateMock } from '../__mocks__/runtime_state.mocks';
import { createReduxTestSetup } from '../__mocks__/create_redux_test_setup';
import * as tabSyncApi from './tab_sync';

const { initializeAndSync, stopSyncing } = tabSyncApi;

describe('tab_sync actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAndSync', () => {
    it('should initialize and sync tab state', async () => {
      const { tabId, initializeSingleTab, runtimeStateManager } = await createReduxTestSetup();
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
      const initializeAndSyncSpy = jest.spyOn(tabSyncApi, 'initializeAndSync');
      const unsubscribeSpy = jest.spyOn(tabRuntimeState, 'unsubscribe');
      const onSubscribeSpy = jest.spyOn(tabRuntimeState, 'onSubscribe');

      await initializeSingleTab({ tabId });

      expect(initializeAndSyncSpy).toHaveBeenCalledWith({ tabId });
      expect(unsubscribeSpy).toHaveBeenCalled();
      expect(onSubscribeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ unsubscribeFn: expect.any(Function) })
      );
    });

    it('should throw error when state container is not initialized', async () => {
      const { internalState, runtimeStateManager, tabId } = await createReduxTestSetup();

      // Create a tab runtime state without a state container
      runtimeStateManager.tabs.byId[tabId] = getTabRuntimeStateMock();

      expect(() => {
        internalState.dispatch(
          initializeAndSync({
            tabId,
          })
        );
      }).toThrow('State container is not initialized');
    });
  });

  describe('stopSyncing', () => {
    it('should stop syncing and call unsubscribe on tab runtime state', async () => {
      const { internalState, runtimeStateManager, tabId } = await createReduxTestSetup();

      const tabRuntimeState = getTabRuntimeStateMock();
      runtimeStateManager.tabs.byId[tabId] = tabRuntimeState;
      const unsubscribeSpy = jest.spyOn(tabRuntimeState, 'unsubscribe');

      const mockUnsubscribe = jest.fn();

      tabRuntimeState.onSubscribe({ unsubscribeFn: mockUnsubscribe });

      internalState.dispatch(
        stopSyncing({
          tabId,
        })
      );

      expect(unsubscribeSpy).toHaveBeenCalled();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
