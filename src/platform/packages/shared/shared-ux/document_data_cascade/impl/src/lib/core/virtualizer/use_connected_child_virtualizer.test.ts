/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act } from 'react-dom/test-utils';
import { renderHook } from '@testing-library/react';
import type { Row } from '@tanstack/react-table';
import {
  createChildVirtualizerController,
  type ChildVirtualizerController,
} from './child_virtualizer_controller';
import { useConnectedChildVirtualizer } from './use_connected_child_virtualizer';
import type { CascadeVirtualizerReturnValue } from '.';
import type { GroupNode } from '../../../store_provider';

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
  });
});
