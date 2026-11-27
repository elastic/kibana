/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { VirtualizerInstanceType } from './types';
import { createChildVirtualizerController } from './child_controller/child_virtualizer_controller';
import {
  useConnectedChildVirtualizer,
  RESTORATION_SETTLE_MS,
  RESTORATION_TIMEOUT_MS,
} from './use_connected_child_virtualizer';
import type { CascadeVirtualizerReturnValue } from './types';
import type { GroupNode } from '../../../store_provider';
import type { CascadeTableRow } from '../table';

jest.mock('@tanstack/react-virtual', () => {
  const actual = jest.requireActual('@tanstack/react-virtual');
  return { ...actual, useVirtualizer: jest.fn(actual.useVirtualizer) };
});

const getNativeVirtualizer = (): VirtualizerInstanceType =>
  jest.mocked(useVirtualizer).mock.results.at(-1)?.value;

const createMockRows = (count: number): Array<CascadeTableRow<GroupNode>> =>
  Array.from(
    { length: count },
    (_, index) =>
      new Proxy(
        {
          id: `row-${index}`,
          index,
          depth: 0,
          getIsExpanded: () => false,
          getParentRows: () => [] as Array<CascadeTableRow<GroupNode>>,
          subRows: [] as Array<CascadeTableRow<GroupNode>>,
        } as CascadeTableRow<GroupNode>,
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
  scrollElement.scrollTop = 500;

  return {
    cancelScroll: jest.fn(),
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
  let controller: ReturnType<typeof createChildVirtualizerController>;
  let rows: ReturnType<typeof createMockRows>;
  let mockRoot: CascadeVirtualizerReturnValue;

  beforeEach(() => {
    jest.useFakeTimers();
    rows = createMockRows(50);
    mockRoot = createMockRootVirtualizer();
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
        rows,
        estimatedRowHeight: 30,
        overscan: 5,
      })
    );

    expect(result.current.virtualizer).toBeDefined();
    expect(result.current.virtualizer.getVirtualItems).toBeDefined();
    expect(result.current.handle).toBeDefined();
    expect(result.current.handle.detachScrollElement).toBeDefined();
    expect(result.current.handle.reattachScrollElement).toBeDefined();
  });

  it('connects to the controller on mount', () => {
    renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows,
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
        rows,
      })
    );

    expect(controller.getConnectedChildren().size).toBe(1);
    unmount();
    expect(controller.getConnectedChildren().size).toBe(0);
  });

  it('uses the scroll margin of its row from the controller', () => {
    const spy = jest.spyOn(controller, 'getScrollMarginForRow');

    renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'cell-a',
        rowIndex: 2,
        rows,
      })
    );

    expect(spy).toHaveBeenCalledWith(2);
  });

  describe('activation gating', () => {
    it('renders no items before root is stable', () => {
      const unstableController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
      });

      renderHook(() =>
        useConnectedChildVirtualizer({
          controller: unstableController,
          cellId: 'cell-a',
          rowIndex: 2,
          rows,
        })
      );

      expect(getNativeVirtualizer().options.count).toBe(0);
      unstableController.destroy();
    });

    it('renders its items after markRootStable + rAF', () => {
      const unstableController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
      });

      renderHook(() =>
        useConnectedChildVirtualizer({
          controller: unstableController,
          cellId: 'cell-a',
          rowIndex: 2,
          rows,
        })
      );

      expect(getNativeVirtualizer().options.count).toBe(0);

      act(() => {
        unstableController.markRootStable();
        flushRaf();
      });

      expect(getNativeVirtualizer().options.count).toBe(rows.length);
      unstableController.destroy();
    });
  });

  it('cleans up and reconnects under Strict Mode without duplicate registrations', () => {
    const { unmount } = renderHook(
      () => useConnectedChildVirtualizer({ controller, cellId: 'strict', rowIndex: 2, rows }),
      {
        wrapper: ({ children }) => React.createElement(React.StrictMode, null, children),
      }
    );
    act(flushRaf);
    expect(getNativeVirtualizer().options.count).toBe(rows.length);
    expect(controller.getConnectedChildren().size).toBe(1);
    expect(controller.hasAttachedChildForRow(2)).toBe(true);
    unmount();
    expect(controller.getConnectedChildren().size).toBe(0);
  });

  it('keeps measured heights across ordinary remounts without restoring an old scroll anchor', () => {
    const renderChild = () =>
      renderHook(() =>
        useConnectedChildVirtualizer({ controller, cellId: 'cached', rowIndex: 2, rows })
      );
    const first = renderChild();
    act(flushRaf);
    act(() => getNativeVirtualizer().resizeItem(0, 120));
    first.unmount();
    const second = renderChild();
    expect(getNativeVirtualizer().options.count).toBe(rows.length);
    expect(second.result.current.virtualizer.takeSnapshot()[0].size).toBe(120);
    expect(controller.getRestoreAnchor('cached')).toBeNull();
    second.unmount();
  });

  it('invalidates cached heights after density, columns, or data changes', () => {
    const { rerender } = renderHook(
      ({ measurementKey, data }) =>
        useConnectedChildVirtualizer({
          controller,
          cellId: 'layout',
          rowIndex: 2,
          rows: data,
          measurementKey,
        }),
      { initialProps: { measurementKey: 'compact:message', data: rows } }
    );
    act(flushRaf);
    const instance = getNativeVirtualizer();
    act(() => instance.resizeItem(0, 120));
    rerender({ measurementKey: 'expanded:message,host', data: rows });
    expect(instance.takeSnapshot()).toEqual([]);
    act(() => instance.resizeItem(0, 150));
    rerender({ measurementKey: 'expanded:message,host', data: createMockRows(50) });
    expect(instance.takeSnapshot()).toEqual([]);
  });

  it('uses offset scrolling when attached and native index scrolling in fullscreen', () => {
    const { result } = renderHook(() =>
      useConnectedChildVirtualizer({
        controller,
        cellId: 'fullscreen',
        rowIndex: 2,
        rows,
        privateScrollElement: { current: document.createElement('div') },
      })
    );
    act(flushRaf);
    const instance = getNativeVirtualizer();
    const scrollIndex = jest.spyOn(instance, 'scrollToIndex');
    const scrollOffset = jest.spyOn(instance, 'scrollToOffset');
    act(() => result.current.virtualizer.scrollToIndex(49));
    expect(scrollIndex).not.toHaveBeenCalled();
    expect(scrollOffset).toHaveBeenCalled();
    act(() => result.current.handle.detachScrollElement());
    act(() => result.current.virtualizer.scrollToIndex(49));
    expect(scrollIndex).toHaveBeenCalledWith(49, undefined);
  });

  describe('restoring the saved document', () => {
    const renderRestoringChild = () => {
      controller.destroy();
      controller = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { target: 5 },
        initialRestorationCellId: 'target',
      });
      const view = renderHook(() =>
        useConnectedChildVirtualizer({ controller, cellId: 'target', rowIndex: 2, rows })
      );
      expect(getNativeVirtualizer().options.count).toBe(0);
      expect(controller.isRestoring).toBe(true);
      act(() => controller.markRootStable());
      return view;
    };

    // a row above the saved document changes height, which moves the position being restored
    let rowAboveSize = 100;
    const moveRestoredPosition = () =>
      act(() => getNativeVirtualizer().resizeItem(0, (rowAboveSize += 1)));

    it('waits for root restoration, then finishes once the restored position has settled', () => {
      renderRestoringChild();
      expect(controller.getRestoreAnchor('target')).toBe(5);

      // no row reports a height that differs from the estimate, the restoration still has to end
      act(() => jest.advanceTimersByTime(RESTORATION_SETTLE_MS - 1));
      expect(controller.isRestoring).toBe(true);
      act(() => jest.advanceTimersByTime(1));
      expect(controller.isRestoring).toBe(false);
    });

    it('starts the wait over when the restored position moves', () => {
      renderRestoringChild();
      act(() => jest.advanceTimersByTime(RESTORATION_SETTLE_MS - 1));
      moveRestoredPosition();
      act(() => jest.advanceTimersByTime(RESTORATION_SETTLE_MS - 1));
      expect(controller.isRestoring).toBe(true);
      act(() => jest.advanceTimersByTime(1));
      expect(controller.isRestoring).toBe(false);
    });

    it('stops waiting at the timeout when the restored position never settles', () => {
      renderRestoringChild();
      const step = RESTORATION_SETTLE_MS - 1;
      let elapsed = 0;
      for (; elapsed + step < RESTORATION_TIMEOUT_MS; elapsed += step) {
        moveRestoredPosition();
        act(() => jest.advanceTimersByTime(step));
        expect(controller.isRestoring).toBe(true);
      }
      moveRestoredPosition();
      act(() => jest.advanceTimersByTime(RESTORATION_TIMEOUT_MS - elapsed));
      expect(controller.isRestoring).toBe(false);
    });

    it('does not finish a restoration that was taken over after it unmounted', () => {
      const { unmount } = renderRestoringChild();
      const finishRestoration = jest.spyOn(controller, 'finishRestoration');
      unmount();
      act(() => jest.advanceTimersByTime(RESTORATION_TIMEOUT_MS));
      expect(finishRestoration).not.toHaveBeenCalled();
    });
  });

  it.each([-1, 50])('finishes restoration for missing document index %i', (anchor) => {
    controller.destroy();
    controller = createChildVirtualizerController({
      getRootVirtualizer: () => mockRoot,
      initialPersistedAnchors: { target: anchor },
      initialRestorationCellId: 'target',
    });
    controller.markRootStable();
    renderHook(() =>
      useConnectedChildVirtualizer({ controller, cellId: 'target', rowIndex: 2, rows })
    );
    expect(controller.isRestoring).toBe(false);
  });

  it('stops a pending restoration when the group collapses before its document is measured', () => {
    controller.destroy();
    controller = createChildVirtualizerController({
      getRootVirtualizer: () => mockRoot,
      initialPersistedAnchors: { target: 5 },
      initialRestorationCellId: 'target',
    });
    controller.markRootStable();
    const { unmount } = renderHook(() =>
      useConnectedChildVirtualizer({ controller, cellId: 'target', rowIndex: 2, rows })
    );
    expect(controller.isRestoring).toBe(true);
    unmount();
    controller.clearPersistedAnchor('target');
    expect(controller.isRestoring).toBe(false);
  });
});
