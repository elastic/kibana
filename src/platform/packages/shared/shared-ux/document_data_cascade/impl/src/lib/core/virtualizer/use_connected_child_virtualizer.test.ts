/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { renderHook } from '@testing-library/react';
import type { Row } from '@tanstack/react-table';
import {
  createChildVirtualizerController,
  type ChildVirtualizerController,
} from './child_virtualizer_controller';
import { useConnectedChildVirtualizer } from './use_connected_child_virtualizer';
import {
  useCascadeVirtualizer,
  type CascadeVirtualizerReturnValue,
  type UseVirtualizerReturnType,
} from '.';
import type { GroupNode } from '../../../store_provider';

jest.mock('.', () => {
  const actual = jest.requireActual('.');
  return { ...actual, useCascadeVirtualizer: jest.fn(actual.useCascadeVirtualizer) };
});

const useCascadeVirtualizerMock = jest.mocked(useCascadeVirtualizer);

const createMockRows = (count: number): Row<GroupNode>[] =>
  Array.from(
    { length: count },
    (_, index) =>
      new Proxy(
        {
          id: `row-${index}`,
          index,
          depth: 0,
          getIsExpanded: () => false,
          getParentRows: () => [] as Row<GroupNode>[],
          subRows: [] as Row<GroupNode>[],
        } as Row<GroupNode>,
        {
          get(target, prop) {
            return Reflect.get(target, prop);
          },
        }
      )
  );

const createMockRootVirtualizer = (): CascadeVirtualizerReturnValue => {
  const scrollElement = document.createElement('div');
  Object.defineProperty(scrollElement, 'clientHeight', { value: 600 });

  return {
    scrollOffset: 500,
    scrollElement,
    measurementsCache: [
      { start: 0, end: 40, size: 40, index: 0, key: 0, lane: 0 },
      { start: 40, end: 80, size: 40, index: 1, key: 1, lane: 0 },
      { start: 80, end: 320, size: 240, index: 2, key: 2, lane: 0 },
    ],
  } as unknown as CascadeVirtualizerReturnValue;
};

const flushRaf = () => jest.advanceTimersByTime(16);

describe('useConnectedChildVirtualizer', () => {
  let controller: ChildVirtualizerController;

  beforeEach(() => {
    jest.useFakeTimers();
    const mockRoot = createMockRootVirtualizer();
    controller = createChildVirtualizerController({
      getRootVirtualizer: () => mockRoot,
    });
    controller.markRootStable();
    flushRaf();
  });

  afterEach(() => {
    controller.destroy();
    jest.useRealTimers();
  });

  it('returns a virtualizer, a handle, and isActive', () => {
    const { result } = renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows: createMockRows(50),
        estimatedRowHeight: 30,
        overscan: 5,
      })
    );

    expect(result.current.virtualizer).toBeDefined();
    expect(result.current.virtualizer.getVirtualItems).toBeDefined();
    expect(result.current.handle).toBeDefined();
    expect(result.current.handle.disconnect).toBeDefined();
    expect(result.current.handle.reportState).toBeDefined();
  });

  it('connects to the controller on mount', () => {
    renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows: createMockRows(50),
      })
    );

    expect(controller.getConnectedChildren().size).toBe(1);
    expect(controller.getConnectedChildren().has('cell-a')).toBe(true);
  });

  it('disconnects from the controller on unmount', () => {
    const { unmount } = renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows: createMockRows(50),
      })
    );

    expect(controller.getConnectedChildren().size).toBe(1);
    unmount();
    expect(controller.getConnectedChildren().size).toBe(0);
  });

  it('creates the virtualizer with isRoot=false (no childController)', () => {
    const { result } = renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows: createMockRows(50),
      })
    );

    expect(result.current.virtualizer.childController).toBeNull();
  });

  it('uses the scroll margin from the controller config', () => {
    const spy = jest.spyOn(controller, 'getChildConfig');

    renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows: createMockRows(50),
      })
    );

    expect(spy).toHaveBeenCalledWith(2);
  });

  describe('connection lifecycle', () => {
    it('reconnects when the connection identity changes', () => {
      const { rerender } = renderHook(
        ({ cellId, rowIndex }: { cellId: string; rowIndex: number }) =>
          useConnectedChildVirtualizer({ controller, cellId, rowIndex, rows: createMockRows(50) }),
        { initialProps: { cellId: 'cell-a', rowIndex: 2 } }
      );
      expect(Array.from(controller.getConnectedChildren().keys())).toEqual(['cell-a']);

      rerender({ cellId: 'cell-b', rowIndex: 4 });

      expect(Array.from(controller.getConnectedChildren().keys())).toEqual(['cell-b']);
      expect(controller.getConnectedChildren().get('cell-b')?.rowIndex).toBe(4);
      // the new connection id restores from its own anchor
      expect(useCascadeVirtualizerMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ scrollRestorationKey: 'cell-b' })
      );
    });

    it('keeps the scroll position when the cell moves to another row, and restores it for a new id', () => {
      const root = createMockRootVirtualizer();
      const scrollElement = root.scrollElement as HTMLElement;
      const scrollTo = jest.fn();
      Object.defineProperty(scrollElement, 'scrollTop', { value: 0, writable: true });
      Object.assign(scrollElement, { scrollTo });
      const localController = createChildVirtualizerController({ getRootVirtualizer: () => root });
      localController.markRootStable();
      flushRaf();
      // scroll restoration records performance marks, which jsdom does not provide
      Object.defineProperty(window, 'performance', {
        value: { mark: jest.fn(), measure: jest.fn(), now: jest.fn() },
        writable: true,
      });
      // another cell of the same cascade left a persisted anchor behind
      const otherHandle = localController.connect('cell-b', 2);
      otherHandle.reportState({ scrollAnchorItemIndex: 5 });
      otherHandle.disconnect();

      const { result, rerender } = renderHook(
        ({ cellId, rowIndex }: { cellId: string; rowIndex: number }) =>
          useConnectedChildVirtualizer({
            controller: localController,
            cellId,
            rowIndex,
            rows: createMockRows(50),
            estimatedRowHeight: 30,
          }),
        { initialProps: { cellId: 'cell-a', rowIndex: 1 } }
      );
      act(() => {
        flushRaf();
      });
      expect(result.current.isActive).toBe(true);

      // the user scrolled within the cell
      act(() => {
        scrollElement.scrollTop = 300;
        scrollElement.dispatchEvent(new Event('scroll'));
      });
      expect(result.current.virtualizer.scrollOffset).toBe(300);
      scrollTo.mockClear();

      rerender({ cellId: 'cell-a', rowIndex: 2 });
      act(() => {
        flushRaf();
      });

      expect(localController.getConnectedChildren().get('cell-a')?.rowIndex).toBe(2);
      expect(result.current.isActive).toBe(true);
      // the new row's start is used as scroll margin, but the position is left alone
      expect(useCascadeVirtualizerMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ scrollRestorationKey: 'cell-a', scrollMargin: 80 })
      );
      expect(scrollTo).not.toHaveBeenCalled();
      expect(result.current.virtualizer.scrollOffset).toBe(300);

      // a different connection id is a new view of the row and restores its own anchor
      rerender({ cellId: 'cell-b', rowIndex: 2 });

      expect(scrollTo).toHaveBeenCalledTimes(1);
      localController.destroy();
    });

    it('keeps a single connection under React strict mode', () => {
      const { unmount } = renderHook(
        () =>
          useConnectedChildVirtualizer({
            controller,
            cellId: 'cell-a',
            rowIndex: 2,
            rows: createMockRows(50),
          }),
        { wrapper: React.StrictMode }
      );
      expect(controller.getConnectedChildren().size).toBe(1);

      unmount();
      expect(controller.getConnectedChildren().size).toBe(0);
    });
  });

  describe('activation gating', () => {
    it('reports isActive=false before root is stable', () => {
      const unstableController = createChildVirtualizerController({
        getRootVirtualizer: () => createMockRootVirtualizer(),
      });

      const { result } = renderHook(() =>
        useConnectedChildVirtualizer({
          controller: unstableController,
          cellId: 'cell-a',
          rowIndex: 2,
          rows: createMockRows(50),
        })
      );

      expect(result.current.isActive).toBe(false);
      unstableController.destroy();
    });

    it('transitions to isActive=true after markRootStable + rAF', () => {
      const unstableController = createChildVirtualizerController({
        getRootVirtualizer: () => createMockRootVirtualizer(),
      });

      const { result } = renderHook(() =>
        useConnectedChildVirtualizer({
          controller: unstableController,
          cellId: 'cell-a',
          rowIndex: 2,
          rows: createMockRows(50),
        })
      );

      expect(result.current.isActive).toBe(false);

      act(() => {
        unstableController.markRootStable();
        flushRaf();
      });

      expect(result.current.isActive).toBe(true);
      unstableController.destroy();
    });

    it('is active on the first render when another connection for the row is already activated', () => {
      controller.connect('cell-a', 2);
      flushRaf();
      expect(controller.shouldActivate(2)).toBe(true);

      const { result } = renderHook(() =>
        useConnectedChildVirtualizer({
          controller,
          cellId: 'cell-a/alternate',
          rowIndex: 2,
          rows: createMockRows(50),
        })
      );

      expect(result.current.isActive).toBe(true);
    });
  });

  describe('scroll anchor persistence', () => {
    const createStabilizedInstance = (scrollOffset: number) =>
      ({
        range: { startIndex: 0, endIndex: 5 },
        scrollOffset,
        scrollRect: { width: 800, height: 400 },
        getTotalSize: () => 1000,
        options: { count: 50 },
        // items of 40px, starting at 0
        measurementsCache: Array.from({ length: 50 }, (_, index) => ({
          index,
          start: index * 40,
          end: index * 40 + 40,
          size: 40,
        })),
        getVirtualItemForOffset: (offset: number) => {
          const index = Math.max(0, Math.min(49, Math.floor(offset / 40)));
          return { index, start: index * 40 };
        },
      } as unknown as UseVirtualizerReturnType);
    // the scroll offset sits 20px into item 3
    const stabilizedInstance = createStabilizedInstance(140);

    const renderActiveHook = () => {
      const hook = renderHook(() =>
        useConnectedChildVirtualizer({
          controller,
          cellId: 'cell-a',
          rowIndex: 2,
          rows: createMockRows(50),
        })
      );
      act(() => {
        flushRaf();
      });
      expect(hook.result.current.isActive).toBe(true);
      return hook;
    };

    const reportStabilizedState = (instance = stabilizedInstance) => {
      const { onStateChange } = useCascadeVirtualizerMock.mock.calls.at(-1)![0];
      act(() => {
        onStateChange!(instance, true, true);
      });
    };

    it('reports stabilization once the virtualizer is stable, without waiting for scroll events', () => {
      renderActiveHook();

      expect(controller.getConnectedChildren().get('cell-a')?.hasStabilized).toBe(true);
    });

    it('does not try to restore an anchor for an active connection without rows', () => {
      const previousHandle = controller.connect('cell-a', 2);
      previousHandle.reportState({ scrollAnchorItemIndex: 10 });
      previousHandle.disconnect();

      const { result } = renderHook(() =>
        useConnectedChildVirtualizer({ controller, cellId: 'cell-a', rowIndex: 2, rows: [] })
      );
      act(() => {
        flushRaf();
      });
      expect(result.current.isActive).toBe(true);
      expect(useCascadeVirtualizerMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ initialAnchorItemIndex: undefined })
      );

      act(() => {
        flushRaf();
        flushRaf();
      });
      expect(controller.getConnectedChildren().get('cell-a')?.hasStabilized).toBe(true);
    });

    it('anchors to the first item with a negative offset when the viewport starts above it', () => {
      renderActiveHook();
      reportStabilizedState(createStabilizedInstance(-30));

      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.scrollAnchorItemIndex).toBe(0);
      expect(state?.scrollAnchorItemOffset).toBe(-30);
    });

    it('reports no anchor while the items do not intersect the viewport', () => {
      renderActiveHook();

      // viewport entirely above the items
      reportStabilizedState(createStabilizedInstance(-500));
      expect(controller.getConnectedChildren().get('cell-a')?.scrollAnchorItemIndex).toBeNull();

      // viewport entirely below the items
      reportStabilizedState(createStabilizedInstance(2500));
      expect(controller.getConnectedChildren().get('cell-a')?.scrollAnchorItemIndex).toBeNull();
    });

    it('persists the scroll anchor and the offset within its item once stabilized, and restores them on reconnect', () => {
      const { unmount } = renderActiveHook();
      reportStabilizedState();

      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.scrollAnchorItemIndex).toBe(3);
      expect(state?.scrollAnchorItemOffset).toBe(20);

      unmount();
      expect(controller.getPersistedAnchor('cell-a')).toBe(3);
      expect(controller.getPersistedAnchorOffset('cell-a')).toBe(20);

      // scroll restoration records performance marks, which jsdom does not provide
      Object.defineProperty(window, 'performance', {
        value: { mark: jest.fn(), measure: jest.fn(), now: jest.fn() },
        writable: true,
      });
      renderActiveHook();
      expect(useCascadeVirtualizerMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ initialAnchorItemIndex: 3, initialAnchorItemOffset: 20 })
      );
    });
  });
});
