/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createChildVirtualizerController } from './child_virtualizer_controller';
import type { CascadeVirtualizerReturnValue, ChildMeasurements } from '../types';

const createMockRootVirtualizer = (
  overrides: Partial<CascadeVirtualizerReturnValue> = {}
): CascadeVirtualizerReturnValue => {
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
      { start: 320, end: 560, size: 240, index: 3, key: 3, lane: 0 },
      { start: 560, end: 800, size: 240, index: 4, key: 4, lane: 0 },
      { start: 800, end: 1040, size: 240, index: 5, key: 5, lane: 0 },
      { start: 1040, end: 1280, size: 240, index: 6, key: 6, lane: 0 },
    ],
    ...overrides,
  } as unknown as CascadeVirtualizerReturnValue;
};

const flushRaf = () => jest.advanceTimersByTime(16);

describe('ChildVirtualizerController', () => {
  let controller: ReturnType<typeof createChildVirtualizerController>;
  let mockRoot: CascadeVirtualizerReturnValue;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRoot = createMockRootVirtualizer();
    controller = createChildVirtualizerController({
      getRootVirtualizer: () => mockRoot,
    });
  });

  afterEach(() => {
    controller.destroy();
    jest.useRealTimers();
  });

  describe('getInitialOffset', () => {
    it('returns the root scrollOffset', () => {
      mockRoot = createMockRootVirtualizer({ scrollElement: null });
      expect(controller.getInitialOffset()).toBe(500);
    });

    it('inherits the DOM offset even before the root receives its scroll event', () => {
      if (!mockRoot.scrollElement) throw new Error('Expected a scroll element');
      mockRoot.scrollElement.scrollTop = 800;
      expect(controller.getInitialOffset()).toBe(800);
    });
  });

  describe('getScrollElement', () => {
    it('returns the root scrollElement', () => {
      expect(controller.getScrollElement()).toBe(mockRoot.scrollElement);
    });
  });

  describe('notifyRootChange', () => {
    it('does not notify while no cell is registered', () => {
      const listener = jest.fn();
      controller.subscribe(listener);

      controller.notifyRootChange();
      flushRaf();

      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies once a cell is enqueued, and stops once that cell is released', () => {
      const listener = jest.fn();
      controller.subscribe(listener);
      const dequeue = controller.enqueue('cell-a', 2);
      listener.mockClear();

      controller.notifyRootChange();
      flushRaf();
      expect(listener).toHaveBeenCalledTimes(1);

      dequeue();
      listener.mockClear();

      controller.notifyRootChange();
      flushRaf();
      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies while a cell is connected, and stops once it disconnects', () => {
      const listener = jest.fn();
      controller.subscribe(listener);
      const handle = controller.connect('cell-a', 2);
      listener.mockClear();

      controller.notifyRootChange();
      flushRaf();
      expect(listener).toHaveBeenCalledTimes(1);

      handle.disconnect();
      listener.mockClear();

      controller.notifyRootChange();
      flushRaf();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('detached children', () => {
    it('reports the detached state of a cell and of the row it is rendered in', () => {
      const handle = controller.connect('cell-a', 2);
      handle.reportState({ scrollAnchorItemIndex: 0 });

      expect(controller.isDetached('cell-a')).toBe(false);
      expect(controller.isRowDetached(2)).toBe(false);
      expect(controller.hasDetachedChild()).toBe(false);

      handle.detachScrollElement();

      expect(controller.isDetached('cell-a')).toBe(true);
      expect(controller.isRowDetached(2)).toBe(true);
      expect(controller.isRowDetached(3)).toBe(false);
      expect(controller.hasDetachedChild()).toBe(true);

      handle.reattachScrollElement();

      expect(controller.isDetached('cell-a')).toBe(false);
      expect(controller.isRowDetached(2)).toBe(false);
      expect(controller.hasDetachedChild()).toBe(false);
    });

    it('reports cells that are not registered as attached', () => {
      expect(controller.isDetached('cell-unknown')).toBe(false);
    });
  });

  describe('getScrollMarginForRow', () => {
    it('returns the current start position from root measurementsCache', () => {
      expect(controller.getScrollMarginForRow(2)).toBe(80);
      expect(controller.getScrollMarginForRow(4)).toBe(560);
    });

    it('reflects updated measurements when root remeasures items', () => {
      expect(controller.getScrollMarginForRow(3)).toBe(320);

      mockRoot.measurementsCache[3] = {
        start: 480,
        end: 720,
        size: 240,
        index: 3,
        key: 3,
        lane: 0,
      };

      expect(controller.getScrollMarginForRow(3)).toBe(480);
    });

    it('returns 0 for unmeasured row indices', () => {
      expect(controller.getScrollMarginForRow(99)).toBe(0);
    });
  });

  describe('connect / disconnect', () => {
    it('adds a child to connected children on connect', () => {
      controller.connect('cell-a', 2);
      const children = controller.getConnectedChildren();

      expect(children.size).toBe(1);
      expect(children.get('cell-a')).toEqual(
        expect.objectContaining({
          cellId: 'cell-a',
          rowIndex: 2,
          scrollOffset: 0,
          range: null,
          isDetached: false,
        })
      );
    });

    it('removes a child from connected children on disconnect', () => {
      const handle = controller.connect('cell-a', 2);
      expect(controller.getConnectedChildren().size).toBe(1);

      handle.disconnect();
      expect(controller.getConnectedChildren().size).toBe(0);
    });

    it('supports multiple concurrent connections', () => {
      controller.connect('cell-a', 1);
      controller.connect('cell-b', 3);

      expect(controller.getConnectedChildren().size).toBe(2);
    });
  });

  describe('enqueue', () => {
    it('adds a child to connected children without creating a handle', () => {
      controller.enqueue('cell-a', 2);
      expect(controller.getConnectedChildren().size).toBe(1);
      expect(controller.getConnectedChildren().has('cell-a')).toBe(true);
    });

    it('notifies listeners on preRegister', () => {
      const listener = jest.fn();
      controller.subscribe(listener);
      controller.enqueue('cell-a', 2);
      expect(listener).toHaveBeenCalled();
    });

    it('schedules staggered activation', () => {
      controller.markRootStable();
      controller.enqueue('cell-a', 2);
      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(true);
    });

    it('unregister removes the child if connect was never called', () => {
      const unregister = controller.enqueue('cell-a', 2);
      expect(controller.getConnectedChildren().size).toBe(1);

      unregister();
      expect(controller.getConnectedChildren().size).toBe(0);
    });

    it('unregister is a no-op after connect promotes the registration', () => {
      const unregister = controller.enqueue('cell-a', 2);
      controller.connect('cell-a', 2);
      expect(controller.getConnectedChildren().size).toBe(1);

      unregister();
      expect(controller.getConnectedChildren().size).toBe(1);
    });

    it('connect reuses existing entry from preRegister instead of overwriting', () => {
      controller.enqueue('cell-a', 2);
      controller.markRootStable();
      flushRaf();

      const handle = controller.connect('cell-a', 2);
      expect(controller.getConnectedChildren().size).toBe(1);

      handle.reportState({ scrollOffset: 100 });
      expect(controller.getConnectedChildren().get('cell-a')?.scrollOffset).toBe(100);
    });

    it('connect applies persisted anchor to pre-registered entry', () => {
      const handle1 = controller.connect('cell-a', 2);
      controller.markRootStable();
      handle1.reportState({ scrollAnchorItemIndex: 15 });
      handle1.disconnect();

      controller.enqueue('cell-a', 2);
      controller.connect('cell-a', 2);
      expect(controller.getConnectedChildren().get('cell-a')?.scrollAnchorItemIndex).toBe(15);
    });

    it('is idempotent for the same cellId', () => {
      controller.enqueue('cell-a', 2);
      controller.enqueue('cell-a', 2);
      expect(controller.getConnectedChildren().size).toBe(1);
    });
  });

  describe('reportState', () => {
    it('updates the child state with partial patches', () => {
      controller.markRootStable();
      const handle = controller.connect('cell-a', 2);

      handle.reportState({
        scrollOffset: 120,
        range: { startIndex: 5, endIndex: 15 },
        totalSize: 6000,
        scrollAnchorItemIndex: 7,
      });

      const state = controller.getConnectedChildren().get('cell-a');
      expect(state).toEqual(
        expect.objectContaining({
          scrollOffset: 120,
          range: { startIndex: 5, endIndex: 15 },
          totalSize: 6000,
          scrollAnchorItemIndex: 7,
          cellId: 'cell-a',
          rowIndex: 2,
        })
      );
    });

    it('does nothing after disconnect', () => {
      const handle = controller.connect('cell-a', 2);
      handle.disconnect();

      handle.reportState({ scrollOffset: 999 });
      expect(controller.getConnectedChildren().size).toBe(0);
    });
  });

  describe('anchor persistence', () => {
    it('persists scrollAnchorItemIndex on disconnect', () => {
      controller.markRootStable();
      const handle = controller.connect('cell-a', 2);
      handle.reportState({ scrollAnchorItemIndex: 15 });
      handle.disconnect();

      expect(controller.getPersistedAnchor('cell-a')).toBe(15);
    });

    it('returns null for unknown cellIds', () => {
      expect(controller.getPersistedAnchor('nonexistent')).toBeNull();
    });

    it('restores persisted anchor into child state on reconnect', () => {
      controller.markRootStable();
      const handle1 = controller.connect('cell-a', 2);
      handle1.reportState({ scrollAnchorItemIndex: 22 });
      handle1.disconnect();

      controller.connect('cell-a', 2);
      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.scrollAnchorItemIndex).toBe(22);
    });

    it('queues a remounted child when it disconnected without an anchor', () => {
      controller.markRootStable();
      const handle = controller.connect('cell-a', 2);
      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(true);
      handle.disconnect();

      expect(controller.getPersistedAnchor('cell-a')).toBeNull();
      expect(controller.isReturningCell('cell-a')).toBe(false);
      controller.connect('cell-a', 2);
      expect(controller.shouldActivate('cell-a')).toBe(false);
      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on connect', () => {
      const listener = jest.fn();
      controller.subscribe(listener);

      controller.connect('cell-a', 2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies listeners on disconnect', () => {
      const handle = controller.connect('cell-a', 2);
      const listener = jest.fn();
      controller.subscribe(listener);

      handle.disconnect();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies listeners on reportState (batched via rAF)', () => {
      controller.markRootStable();
      const handle = controller.connect('cell-a', 2);
      flushRaf(); // drain stagger activation rAF

      const listener = jest.fn();
      controller.subscribe(listener);

      handle.reportState({ scrollOffset: 100 });
      handle.reportState({ scrollOffset: 200 });
      expect(listener).not.toHaveBeenCalled();

      flushRaf();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies listeners on markRootStable', () => {
      const listener = jest.fn();
      controller.subscribe(listener);

      controller.markRootStable();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops notifications', () => {
      const listener = jest.fn();
      const unsub = controller.subscribe(listener);
      unsub();

      controller.connect('cell-a', 2);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('shouldActivate', () => {
    it('returns false before markRootStable is called', () => {
      controller.connect('cell-a', 0);
      expect(controller.shouldActivate('cell-a')).toBe(false);
    });

    it('returns false immediately after markRootStable (before rAF)', () => {
      controller.connect('cell-a', 2);
      controller.markRootStable();
      expect(controller.shouldActivate('cell-a')).toBe(false);
    });

    it('returns true after markRootStable and one rAF cycle', () => {
      controller.connect('cell-a', 2);
      controller.markRootStable();
      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(true);
    });
  });

  describe('staggered activation', () => {
    it('activates one child per rAF frame', () => {
      controller.connect('cell-a', 1);
      controller.connect('cell-b', 3);
      controller.connect('cell-c', 5);
      controller.markRootStable();

      expect(controller.shouldActivate('cell-a')).toBe(false);
      expect(controller.shouldActivate('cell-b')).toBe(false);
      expect(controller.shouldActivate('cell-c')).toBe(false);

      flushRaf();
      const activatedAfterFrame1 = ['cell-a', 'cell-b', 'cell-c'].filter((cellId) =>
        controller.shouldActivate(cellId)
      );
      expect(activatedAfterFrame1).toHaveLength(1);

      flushRaf();
      const activatedAfterFrame2 = ['cell-a', 'cell-b', 'cell-c'].filter((cellId) =>
        controller.shouldActivate(cellId)
      );
      expect(activatedAfterFrame2).toHaveLength(2);

      flushRaf();
      const activatedAfterFrame3 = ['cell-a', 'cell-b', 'cell-c'].filter((cellId) =>
        controller.shouldActivate(cellId)
      );
      expect(activatedAfterFrame3).toHaveLength(3);
    });

    it('prioritizes children closer to viewport center', () => {
      // viewport center = scrollOffset(500) + clientHeight(600)/2 = 800
      // row 2: center at 80 + 240/2 = 200, distance = 600
      // row 4: center at 560 + 240/2 = 680, distance = 120
      // row 6: center at 1040 + 240/2 = 1160, distance = 360
      controller.connect('cell-far', 2);
      controller.connect('cell-close', 4);
      controller.connect('cell-mid', 6);
      controller.markRootStable();

      flushRaf();
      expect(controller.shouldActivate('cell-close')).toBe(true);
      expect(controller.shouldActivate('cell-far')).toBe(false);
      expect(controller.shouldActivate('cell-mid')).toBe(false);

      flushRaf();
      expect(controller.shouldActivate('cell-mid')).toBe(true);
      expect(controller.shouldActivate('cell-far')).toBe(false);

      flushRaf();
      expect(controller.shouldActivate('cell-far')).toBe(true);
    });

    it('drains more than five registrations without requiring a disconnect', () => {
      for (let index = 0; index < 9; index++) controller.enqueue(`cell-${index}`, index);
      controller.markRootStable();
      for (let frame = 1; frame <= 9; frame++) {
        flushRaf();
        expect(
          Array.from({ length: 9 }, (_, index) =>
            controller.shouldActivate(`cell-${index}`)
          ).filter(Boolean)
        ).toHaveLength(frame);
      }
    });

    it('removes cancelled entries and re-evaluates priority each frame', () => {
      const cancel = controller.enqueue('cancelled', 4);
      controller.enqueue('first', 2);
      controller.markRootStable();
      cancel();
      controller.enqueue('new-visible', 5);
      flushRaf();
      expect(controller.shouldActivate('cancelled')).toBe(false);
      expect(controller.shouldActivate('new-visible')).toBe(true);
      flushRaf();
      expect(controller.shouldActivate('first')).toBe(true);
    });

    it('preserves activation while an existing cell changes flattened index', () => {
      const unregister = controller.enqueue('cell-a', 4);
      const connection = controller.connect('cell-a', 4);
      controller.markRootStable();
      flushRaf();
      unregister();
      controller.enqueue('cell-a', 2);
      connection.reportState({ rowIndex: 2 });
      expect(controller.shouldActivate('cell-a')).toBe(true);
      expect(controller.hasAttachedChildForRow(4)).toBe(false);
      expect(controller.hasAttachedChildForRow(2)).toBe(true);
    });

    it('ignores cleanup from an obsolete registration and connection', () => {
      const unregister = controller.enqueue('cell-a', 1);
      const obsolete = controller.connect('cell-a', 1);
      controller.enqueue('cell-a', 3);
      const current = controller.connect('cell-a', 3);
      unregister();
      obsolete.disconnect();
      obsolete.reportState({ rowIndex: 1 });
      obsolete.detachScrollElement();
      expect(controller.getConnectedChildren().get('cell-a')?.rowIndex).toBe(3);
      expect(controller.hasAttachedChildForRow(3)).toBe(true);

      current.detachScrollElement();
      obsolete.reattachScrollElement();
      expect(controller.getConnectedChildren().get('cell-a')?.isDetached).toBe(true);
      current.reattachScrollElement();
      expect(controller.hasAttachedChildForRow(3)).toBe(true);
    });
  });

  describe('hasAttachedChildForRow', () => {
    it('is true for a connected child sharing the root scroll element', () => {
      controller.markRootStable();
      flushRaf();
      controller.connect('cell-a', 2);
      flushRaf();

      expect(controller.hasAttachedChildForRow(2)).toBe(true);
      expect(controller.hasAttachedChildForRow(3)).toBe(false);
    });

    it('is false while the child is detached and true again once reattached', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();

      handle.detachScrollElement();
      expect(controller.hasAttachedChildForRow(2)).toBe(false);

      handle.reattachScrollElement();
      expect(controller.hasAttachedChildForRow(2)).toBe(true);
    });

    it('is false after the child disconnects', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();

      handle.disconnect();
      expect(controller.hasAttachedChildForRow(2)).toBe(false);
    });
  });

  describe('detach / reattach', () => {
    it('marks child as detached on detachScrollElement', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();

      handle.detachScrollElement();
      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.isDetached).toBe(true);
    });

    it('persists anchor on detach', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();
      handle.reportState({ scrollAnchorItemIndex: 10 });

      handle.detachScrollElement();
      expect(controller.getPersistedAnchor('cell-a')).toBe(10);
    });

    it('marks child as attached on reattachScrollElement', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();
      handle.detachScrollElement();

      handle.reattachScrollElement();
      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.isDetached).toBe(false);
    });

    it('accepts reports immediately after reattach', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();
      handle.detachScrollElement();
      handle.reattachScrollElement();

      handle.reportState({ scrollOffset: 999 });
      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.scrollOffset).toBe(999);

      flushRaf();
      handle.reportState({ scrollOffset: 888 });
      const stateAfterRaf = controller.getConnectedChildren().get('cell-a');
      expect(stateAfterRaf?.scrollOffset).toBe(888);
    });

    it('notifies listeners on detach and reattach', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();

      const listener = jest.fn();
      controller.subscribe(listener);

      handle.detachScrollElement();
      expect(listener).toHaveBeenCalledTimes(1);

      handle.reattachScrollElement();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('does nothing on double detach', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();

      const listener = jest.fn();
      controller.subscribe(listener);

      handle.detachScrollElement();
      handle.detachScrollElement();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does nothing on reattach when not detached', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();

      const listener = jest.fn();
      controller.subscribe(listener);

      handle.reattachScrollElement();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('returning cells (isReturningCell / persisted anchors)', () => {
    it('isReturningCell returns false for unknown cells', () => {
      expect(controller.isReturningCell('cell-unknown')).toBe(false);
    });

    it('isReturningCell returns true for cells with persisted anchors', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      expect(returningController.isReturningCell('cell-a')).toBe(true);
      returningController.destroy();
    });

    it('isReturningCell returns false when persisted anchor is null', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': null },
      });
      expect(returningController.isReturningCell('cell-a')).toBe(false);
      returningController.destroy();
    });

    it.each([0, 5])('enqueue immediately activates a cell with persisted anchor %s', (anchor) => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': anchor },
      });
      returningController.markRootStable();
      expect(returningController.isReturningCell('cell-a')).toBe(true);
      expect(returningController.shouldActivate('cell-a')).toBe(true);
      returningController.enqueue('cell-a', 2);

      expect(returningController.shouldActivate('cell-a')).toBe(true);
      returningController.destroy();
    });

    it('enqueue does not immediately activate a returning cell when root is not stable', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      returningController.enqueue('cell-a', 2);

      expect(returningController.shouldActivate('cell-a')).toBe(false);
      returningController.destroy();
    });

    it('non-returning cells still go through staggered activation', () => {
      controller.markRootStable();
      controller.enqueue('cell-a', 2);

      expect(controller.shouldActivate('cell-a')).toBe(false);

      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(true);
    });

    it('returning cells do not delay activation of new cells', () => {
      const limitedController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-returning': 5 },
      });

      limitedController.markRootStable();

      limitedController.enqueue('cell-returning', 2);
      expect(limitedController.shouldActivate('cell-returning')).toBe(true);

      limitedController.enqueue('cell-a', 4);
      limitedController.enqueue('cell-b', 6);
      flushRaf();
      flushRaf();

      const activatedNonReturning = ['cell-a', 'cell-b'].filter((cellId) =>
        limitedController.shouldActivate(cellId)
      ).length;
      expect(activatedNonReturning).toBe(2);

      limitedController.destroy();
    });

    it('notifies listeners when a returning cell is immediately activated via enqueue', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      returningController.markRootStable();
      const listener = jest.fn();
      returningController.subscribe(listener);

      returningController.enqueue('cell-a', 2);

      expect(listener).toHaveBeenCalled();
      returningController.destroy();
    });

    it('isReturningCell returns true for cells that disconnect and persist their anchor', () => {
      controller.markRootStable();
      const handle = controller.connect('cell-a', 2);
      handle.reportState({ scrollAnchorItemIndex: 10 });
      handle.disconnect();

      expect(controller.isReturningCell('cell-a')).toBe(true);
    });

    it('clearPersistedAnchor removes the returning status for a cell', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      expect(returningController.isReturningCell('cell-a')).toBe(true);

      returningController.clearPersistedAnchor('cell-a');
      expect(returningController.isReturningCell('cell-a')).toBe(false);
      returningController.destroy();
    });

    it('enqueue does not immediately activate after clearPersistedAnchor', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      returningController.markRootStable();
      returningController.clearPersistedAnchor('cell-a');
      returningController.enqueue('cell-a', 2);

      expect(returningController.shouldActivate('cell-a')).toBe(false);
      returningController.destroy();
    });

    describe('activation of a returning cell on its first render', () => {
      it('activates a returning cell without it being enqueued', () => {
        const returningController = createChildVirtualizerController({
          getRootVirtualizer: () => mockRoot,
          initialPersistedAnchors: { 'cell-a': 5 },
        });
        returningController.markRootStable();

        expect(returningController.shouldActivate('cell-a')).toBe(true);
        returningController.destroy();
      });

      it('does not activate a returning cell before the root is stable', () => {
        const returningController = createChildVirtualizerController({
          getRootVirtualizer: () => mockRoot,
          initialPersistedAnchors: { 'cell-a': 5 },
        });

        expect(returningController.shouldActivate('cell-a')).toBe(false);
        returningController.destroy();
      });

      it('leaves a cell that has no persisted anchor to the staggered activation', () => {
        controller.markRootStable();

        expect(controller.shouldActivate('cell-a')).toBe(false);
      });

      it('activates a cell that disconnected while scrolling out of the list when it mounts again', () => {
        controller.markRootStable();
        const handle = controller.connect('cell-a', 2);
        handle.reportState({ scrollAnchorItemIndex: 10 });
        handle.disconnect();

        expect(controller.shouldActivate('cell-a')).toBe(true);
      });

      it('no longer activates a cell once its persisted anchor has been cleared', () => {
        const returningController = createChildVirtualizerController({
          getRootVirtualizer: () => mockRoot,
          initialPersistedAnchors: { 'cell-a': 5 },
        });
        returningController.markRootStable();
        returningController.clearPersistedAnchor('cell-a');

        expect(returningController.shouldActivate('cell-a')).toBe(false);
        returningController.destroy();
      });
    });

    describe('getRestoreAnchor', () => {
      const restoring = () =>
        createChildVirtualizerController({
          getRootVirtualizer: () => mockRoot,
          initialPersistedAnchors: { 'cell-a': 5, 'cell-b': 10 },
          initialRestorationCellId: 'cell-b',
        });

      it('waits for the root, then restores only the viewport anchor child', () => {
        const instance = restoring();
        expect(instance.getRestoreAnchor('cell-b')).toBeNull();
        instance.markRootStable();
        expect(instance.getRestoreAnchor('cell-a')).toBeNull();
        expect(instance.getRestoreAnchor('cell-b')).toBe(10);
        instance.finishRestoration('cell-a');
        expect(instance.isRestoring).toBe(true);
        instance.finishRestoration('cell-b');
        expect(instance.getRestoreAnchor('cell-b')).toBeNull();
        expect(instance.isRestoring).toBe(false);
        instance.destroy();
      });

      it('does not restore a previous viewport when a cell remounts while scrolling', () => {
        const connection = controller.connect('cell-a', 2);
        connection.reportState({ scrollAnchorItemIndex: 10 });
        connection.disconnect();
        controller.markRootStable();
        controller.connect('cell-a', 2);
        expect(controller.getPersistedAnchor('cell-a')).toBe(10);
        expect(controller.getRestoreAnchor('cell-a')).toBeNull();
      });

      it('drops a pending anchor when its cell collapses, is removed, or fails to load', () => {
        const instance = restoring();
        instance.clearPersistedAnchor('cell-b');
        instance.markRootStable();
        expect(instance.isRestoring).toBe(false);
        expect(instance.getRestoreAnchor('cell-b')).toBeNull();
        instance.destroy();
      });

      it('cancels the pending child scroll when restoration ends or the user takes over', () => {
        const instance = restoring();
        const cancel = jest.fn();
        const otherCancel = jest.fn();
        instance.connect('cell-a', 1, otherCancel);
        instance.connect('cell-b', 2, cancel);
        instance.finishRestoration();
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(otherCancel).not.toHaveBeenCalled();
        instance.destroy();
      });

      it('cancels only the current handle after replacing a restoration connection', () => {
        const instance = restoring();
        const cancelObsolete = jest.fn();
        const cancelCurrent = jest.fn();
        const obsolete = instance.connect('cell-b', 2, cancelObsolete);
        instance.connect('cell-b', 2, cancelCurrent);

        obsolete.disconnect();
        instance.finishRestoration('cell-b');

        expect(cancelObsolete).not.toHaveBeenCalled();
        expect(cancelCurrent).toHaveBeenCalledTimes(1);
        expect(instance.hasAttachedChildForRow(2)).toBe(true);
        instance.destroy();
      });

      it('ignores a missing saved anchor', () => {
        const instance = createChildVirtualizerController({
          getRootVirtualizer: () => mockRoot,
          initialRestorationCellId: 'missing',
        });
        expect(instance.isRestoring).toBe(false);
        instance.destroy();
      });
    });
  });

  describe('measurements', () => {
    it('isolates heights by cell, data and layout settings', () => {
      const rows = [{ id: 'row' }];
      const first = [{ index: 0, start: 0, end: 40, size: 40, key: 'row', lane: 0 }];
      const second = [{ ...first[0], size: 90, end: 90 }];
      controller.saveMeasurements('first', { rows, layoutKey: 'compact', items: first });
      controller.saveMeasurements('second', { rows, layoutKey: 'compact', items: second });
      expect(controller.getMeasurements('first', [...rows], 'compact')).toEqual(first);
      expect(controller.getMeasurements('second', rows, 'compact')).toEqual(second);
      expect(controller.getMeasurements('first', rows, 'expanded')).toEqual([]);
      expect(controller.getMeasurements('first', [{ id: 'row' }], 'compact')).toEqual([]);
      controller.clearPersistedAnchor('first');
      expect(controller.getMeasurements('first', rows, 'compact')).toEqual([]);
    });
  });

  describe('retained child entries', () => {
    const rows = [{ id: 'document-a' }];
    const snapshot: ChildMeasurements = {
      rows,
      layoutKey: 'compact',
      items: [{ index: 0, key: 'document-a', start: 80, end: 114, size: 34, lane: 0 }],
    };

    it('retains measurements without bypassing activation when no anchor was saved', () => {
      controller.markRootStable();
      const handle = controller.connect('cell-a', 2);
      flushRaf();
      controller.saveMeasurements('cell-a', snapshot);
      handle.disconnect();

      expect(controller.getMeasurements('cell-a', rows, 'compact')).toEqual(snapshot.items);
      expect(controller.isReturningCell('cell-a')).toBe(false);
      controller.enqueue('cell-a', 4);
      expect(controller.shouldActivate('cell-a')).toBe(false);
      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(true);
    });

    it.each(['enqueue first', 'connection first'])(
      'retains cached data without exposing an unmounted child when cleaning up %s',
      (cleanupOrder) => {
        controller.markRootStable();
        const unregister = controller.enqueue('cell-a', 2);
        const handle = controller.connect('cell-a', 2);
        handle.reportState({
          scrollAnchorItemIndex: 0,
          scrollOffset: 120,
          range: { startIndex: 0, endIndex: 0 },
          totalSize: 34,
        });
        controller.saveMeasurements('cell-a', snapshot);

        if (cleanupOrder === 'enqueue first') {
          unregister();
          expect(controller.getConnectedChildren().has('cell-a')).toBe(true);
          handle.disconnect();
        } else {
          handle.disconnect();
          expect(controller.getConnectedChildren().has('cell-a')).toBe(true);
          expect(controller.hasAttachedChildForRow(2)).toBe(false);
          unregister();
        }

        expect(controller.getConnectedChildren().size).toBe(0);
        expect(controller.hasAttachedChildForRow(2)).toBe(false);
        expect(controller.isReturningCell('cell-a')).toBe(true);
        expect(controller.getPersistedAnchor('cell-a')).toBe(0);
        expect(controller.getMeasurements('cell-a', rows, 'compact')).toEqual(snapshot.items);

        controller.connect('cell-a', 4);
        expect(controller.shouldActivate('cell-a')).toBe(true);
        expect(controller.getConnectedChildren().get('cell-a')).toEqual({
          cellId: 'cell-a',
          rowIndex: 4,
          scrollOffset: 0,
          range: null,
          totalSize: 0,
          totalItemCount: 0,
          scrollAnchorItemIndex: 0,
          isDetached: false,
          hasStabilized: false,
        });
      }
    );

    it('does not register or schedule children represented only by cached data', () => {
      const restoredController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'saved-cell': 0 },
      });
      restoredController.saveMeasurements('measured-cell', snapshot);
      restoredController.markRootStable();

      expect(restoredController.getConnectedChildren().size).toBe(0);
      expect(restoredController.isReturningCell('saved-cell')).toBe(true);
      expect(restoredController.isReturningCell('measured-cell')).toBe(false);
      expect(jest.getTimerCount()).toBe(0);

      restoredController.enqueue('new-cell', 2);
      flushRaf();
      expect(restoredController.shouldActivate('new-cell')).toBe(true);
      expect([...restoredController.getConnectedChildren().keys()]).toEqual(['new-cell']);
      expect(jest.getTimerCount()).toBe(0);
      restoredController.destroy();
    });

    it.each([false, true])(
      'clears retained data while preserving any live registration (connected: %s)',
      (isConnected) => {
        const previous = controller.connect('cell-a', 2);
        previous.reportState({ scrollAnchorItemIndex: 0 });
        previous.disconnect();
        controller.saveMeasurements('cell-a', snapshot);
        const current = isConnected ? controller.connect('cell-a', 4) : undefined;

        controller.clearPersistedAnchor('cell-a');

        expect(controller.isReturningCell('cell-a')).toBe(false);
        expect(controller.getPersistedAnchor('cell-a')).toBeNull();
        expect(controller.getMeasurements('cell-a', rows, 'compact')).toEqual([]);
        expect(controller.getConnectedChildren().has('cell-a')).toBe(isConnected);
        current?.reportState({ scrollOffset: 120 });
        if (isConnected) {
          expect(controller.getConnectedChildren().get('cell-a')?.scrollOffset).toBe(120);
        } else {
          controller.markRootStable();
          controller.enqueue('cell-a', 4);
          expect(controller.shouldActivate('cell-a')).toBe(false);
        }
      }
    );
  });

  describe('destroy', () => {
    it('cancels pending rAF', () => {
      controller.connect('cell-a', 2);
      controller.markRootStable();
      controller.destroy();
      flushRaf();
      expect(controller.shouldActivate('cell-a')).toBe(false);
    });
  });
});
