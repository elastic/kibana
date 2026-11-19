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
import type { VirtualizerInstanceType } from '../virtualizer';
import { Virtualizer } from '@tanstack/react-virtual';
import { createChildVirtualizerController } from '../virtualizer/child_controller';

describe('useExposePublicApi', () => {
  it('should return the correct value', () => {
    const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
      current: null,
    };

    const { result } = renderHook(
      () =>
        useExposePublicApi(mockRefObject, {
          rows: [],
          enableStickyGroupHeader: false,
        }),
      {
        wrapper: ({ children }) => (
          <DataCascadeProvider data={[]} cascadeGroups={[]}>
            {children}
          </DataCascadeProvider>
        ),
      }
    );

    expect(result.current.collectVirtualizerStateChanges).toBeDefined();
    // ref should be populated with public API method after mount
    expect(mockRefObject.current?.getUISnapshotStore).toBeDefined();
  });

  it('does not publish intermediate root or child anchors while restoring', () => {
    jest.useFakeTimers();
    const ref = React.createRef<DataCascadeImplRef<GroupNode, LeafNode>>();
    const controller = createChildVirtualizerController({ getRootVirtualizer: () => undefined });
    const instance = new Virtualizer<Element, Element>({
      count: 20,
      estimateSize: () => 40,
      getScrollElement: () => null,
      observeElementOffset: jest.fn(),
      observeElementRect: jest.fn(),
      scrollToFn: jest.fn(),
    });
    const { result, rerender, unmount } = renderHook(
      ({ isRestoring }) =>
        useExposePublicApi(ref, {
          rows: [],
          enableStickyGroupHeader: false,
          childController: controller,
          isRestoring,
        }),
      {
        initialProps: { isRestoring: true },
        wrapper: ({ children }) => (
          <DataCascadeProvider data={[]} cascadeGroups={[]}>
            {children}
          </DataCascadeProvider>
        ),
      }
    );
    const store = ref.current?.getUISnapshotStore();
    const listener = jest.fn();
    const unsubscribe = store?.subscribe(listener);
    act(() => {
      instance.scrollOffset = 200;
      result.current.collectVirtualizerStateChanges(instance);
      controller.connect('child', 5).reportState({ scrollAnchorItemIndex: 10 });
      jest.advanceTimersByTime(200);
    });
    expect(listener).not.toHaveBeenCalled();
    rerender({ isRestoring: false });
    act(() => {
      instance.scrollOffset = 400;
      result.current.collectVirtualizerStateChanges(instance);
      jest.advanceTimersByTime(200);
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store?.getSnapshot().scrollOffset).toBe(400);
    expect(store?.getSnapshot().connectedChildren.child.scrollAnchorItemIndex).toBe(10);
    unsubscribe?.();
    unmount();
    controller.destroy();
    jest.useRealTimers();
  });

  describe('getUISnapshotStore', () => {
    it('should return a store snapshot with the correct initial state', () => {
      const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
        current: null,
      };

      const { result } = renderHook(
        () =>
          useExposePublicApi(mockRefObject, {
            rows: [],
            enableStickyGroupHeader: false,
          }),
        {
          wrapper: ({ children }) => (
            <DataCascadeProvider data={[]} cascadeGroups={[]}>
              {children}
            </DataCascadeProvider>
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
        connectedChildren: {},
        scrollAnchorItemIndex: null,
      });
    });

    it('changes on the virtualizer instance should notify subscribers, and reflect changes in the store snapshot', async () => {
      const mockRefObject: React.RefObject<DataCascadeImplRef<GroupNode, LeafNode>> = {
        current: null,
      };

      const { result } = renderHook(
        () =>
          useExposePublicApi(mockRefObject, {
            rows: [],
            enableStickyGroupHeader: false,
          }),
        {
          wrapper: ({ children }) => (
            <DataCascadeProvider data={[]} cascadeGroups={[]}>
              {children}
            </DataCascadeProvider>
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
        getTotalSize: () => 0,
        getVirtualItemForOffset: jest.fn().mockReturnValue({ index: 10 }),
        // it's fine to cast to unknown
        // because we only need a minimal implementation of the virtualizer instance for the test
      } as unknown as VirtualizerInstanceType;

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
      expect(updatedUISnapshot).toHaveProperty('scrollAnchorItemIndex', 10);

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
        () =>
          useExposePublicApi(mockRefObject, {
            rows: [],
            enableStickyGroupHeader: false,
          }),
        {
          wrapper: ({ children }) => (
            <DataCascadeProvider data={[]} cascadeGroups={[]}>
              {children}
            </DataCascadeProvider>
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
        connectedChildren: {},
        scrollAnchorItemIndex: null,
      });

      act(() => {
        result.current.collectVirtualizerStateChanges({
          range: { startIndex: 0, endIndex: 10 },
          scrollOffset: 100,
          isScrolling: false,
          scrollRect: { width: 0, height: 0 },
          getTotalSize: () => 0,
          getVirtualItemForOffset: jest.fn().mockReturnValue({ index: 10 }),
        } as unknown as VirtualizerInstanceType);
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
          connectedChildren: {},
          scrollAnchorItemIndex: 10,
        });
      });
    });
  });
});
