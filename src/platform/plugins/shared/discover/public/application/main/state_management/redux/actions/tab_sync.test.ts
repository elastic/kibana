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
      const previousUnsubscribeFn = jest.fn();
      const { tabId, initializeSingleTab, runtimeStateManager } = await createReduxTestSetup();
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
      tabRuntimeState.unsubscribeFn$.next(previousUnsubscribeFn);

      const initializeAndSyncSpy = jest.spyOn(tabSyncApi, 'initializeAndSync');
      const stopSyncingSpy = jest.spyOn(tabSyncApi, 'stopSyncing');

      await initializeSingleTab({ tabId });

      expect(initializeAndSyncSpy).toHaveBeenCalledWith({ tabId });
      expect(stopSyncingSpy).toHaveBeenCalledWith({ tabId });
      expect(previousUnsubscribeFn).toHaveBeenCalled();
      expect(tabRuntimeState.unsubscribeFn$.getValue()).toStrictEqual(expect.any(Function));
      expect(tabRuntimeState.unsubscribeFn$.getValue()).not.toBe(previousUnsubscribeFn);
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

      const mockUnsubscribe = jest.fn();
      tabRuntimeState.unsubscribeFn$.next(mockUnsubscribe);

      internalState.dispatch(
        stopSyncing({
          tabId,
        })
      );

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(tabRuntimeState.unsubscribeFn$.getValue()).toBeUndefined();
    });
  });
});
