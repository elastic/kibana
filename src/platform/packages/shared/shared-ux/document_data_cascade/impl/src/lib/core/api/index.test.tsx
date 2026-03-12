/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useSyncExternalStore } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExposePublicApi, type DataCascadeImplRef } from '.';
import { DataCascadeProvider, type GroupNode, type LeafNode } from '../../../store_provider';
import type { UseVirtualizerReturnType } from '../virtualizer';

describe('useExposePublicApi', () => {
  it('should return the correct value', () => {
    const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
      current: null,
    };

    const { result } = renderHook(
      () => useExposePublicApi(mockRefObject, { rows: [], enableStickyGroupHeader: false }),
      {
        wrapper: ({ children }) => (
          <DataCascadeProvider cascadeGroups={[]}>{children}</DataCascadeProvider>
        ),
      }
    );

    expect(result.current.collectVirtualizerStateChanges).toBeDefined();
    // ref should be populated with public API method after mount
    expect(mockRefObject.current?.getUISnapshotStore).toBeDefined();
  });

  describe('getUISnapshotStore', () => {
    it('should return a store snapshot with the correct initial state', () => {
      const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
        current: null,
      };

      const { result } = renderHook(
        () => useExposePublicApi(mockRefObject, { rows: [], enableStickyGroupHeader: false }),
        {
          wrapper: ({ children }) => (
            <DataCascadeProvider cascadeGroups={[]}>{children}</DataCascadeProvider>
          ),
        }
      );

      expect(result.current.collectVirtualizerStateChanges).toBeDefined();
      expect(mockRefObject.current?.getUISnapshotStore).toBeDefined();

      const snapshotStore = mockRefObject.current!.getUISnapshotStore();

      expect(snapshotStore!.getSnapshot()).toEqual({
        scrollOffset: 0,
        range: null,
        isScrolling: false,
        activeStickyIndex: null,
        totalRowCount: 0,
        totalSize: 0,
        expanded: {},
        rowSelection: {},
        scrollRect: { width: 0, height: 0 },
      });
    });

    it('changes on the virtualizer instance should notify subscribers, and reflect changes in the store snapshot', async () => {
      const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
        current: null,
      };

      const { result } = renderHook(
        () => useExposePublicApi(mockRefObject, { rows: [], enableStickyGroupHeader: false }),
        {
          wrapper: ({ children }) => (
            <DataCascadeProvider cascadeGroups={[]}>{children}</DataCascadeProvider>
          ),
        }
      );

      expect(result.current.collectVirtualizerStateChanges).toBeDefined();
      expect(mockRefObject.current?.getUISnapshotStore).toBeDefined();

      const uiSnapshotStore = mockRefObject.current!.getUISnapshotStore();

      const subscriptionSpy = jest.fn();

      const unsubscribe = uiSnapshotStore!.subscribe(subscriptionSpy);

      const virtualizerInstance = {
        range: { startIndex: 0, endIndex: 10 },
        scrollOffset: 100,
        isScrolling: false,
        // it's fine to cast to unknown
        // because we only need a minimal implementation of the virtualizer instance for the test
      } as unknown as UseVirtualizerReturnType;

      // simulate changes in the virtualizer instance
      act(() => {
        result.current.collectVirtualizerStateChanges(virtualizerInstance);
      });

      await waitFor(() => {
        // wait for the debounce to complete
        expect(subscriptionSpy).toHaveBeenCalled();
      });

      const updatedUISnapshot = uiSnapshotStore!.getSnapshot();

      expect(updatedUISnapshot).toHaveProperty('scrollOffset', virtualizerInstance.scrollOffset);
      expect(updatedUISnapshot).toHaveProperty('range', virtualizerInstance.range);
      expect(updatedUISnapshot).toHaveProperty('isScrolling', virtualizerInstance.isScrolling);

      // these properties did not change because we did not provide updates for them
      expect(updatedUISnapshot).toHaveProperty('activeStickyIndex', null);
      expect(updatedUISnapshot).toHaveProperty('totalRowCount', 0);
      expect(updatedUISnapshot).toHaveProperty('totalSize', 0);
      expect(updatedUISnapshot).toHaveProperty('expanded', {});
      expect(updatedUISnapshot).toHaveProperty('rowSelection', {});
      expect(updatedUISnapshot).toHaveProperty('scrollRect', { width: 0, height: 0 });

      unsubscribe();
    });

    it('should be compatible with the useSyncExternalStore hook', async () => {
      const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
        current: null,
      };

      const { result } = renderHook(
        () => useExposePublicApi(mockRefObject, { rows: [], enableStickyGroupHeader: false }),
        {
          wrapper: ({ children }) => (
            <DataCascadeProvider cascadeGroups={[]}>{children}</DataCascadeProvider>
          ),
        }
      );

      expect(result.current.collectVirtualizerStateChanges).toBeDefined();
      expect(mockRefObject.current?.getUISnapshotStore).toBeDefined();

      const snapshotStore = mockRefObject.current!.getUISnapshotStore();

      const { result: externalSyncResult } = renderHook(() =>
        useSyncExternalStore(
          snapshotStore!.subscribe,
          snapshotStore!.getSnapshot,
          snapshotStore!.getServerSnapshot
        )
      );

      expect(externalSyncResult.current).toEqual({
        scrollOffset: 0,
        range: null,
        isScrolling: false,
        activeStickyIndex: null,
        totalRowCount: 0,
        totalSize: 0,
        expanded: {},
        rowSelection: {},
        scrollRect: { width: 0, height: 0 },
      });

      act(() => {
        result.current.collectVirtualizerStateChanges({
          range: { startIndex: 0, endIndex: 10 },
          scrollOffset: 100,
          isScrolling: false,
          scrollRect: { width: 0, height: 0 },
          getTotalSize: () => 0,
        } as unknown as UseVirtualizerReturnType);
      });

      await waitFor(() => {
        expect(externalSyncResult.current).toEqual({
          scrollOffset: 100,
          range: { startIndex: 0, endIndex: 10 },
          isScrolling: false,
          activeStickyIndex: null,
          totalRowCount: 0,
          totalSize: 0,
          expanded: {},
          rowSelection: {},
          scrollRect: { width: 0, height: 0 },
        });
      });
    });
  });
});
