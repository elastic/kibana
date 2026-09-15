/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createChildVirtualizerController,
  type ChildVirtualizerController,
} from './child_virtualizer_controller';
import type { CascadeVirtualizerReturnValue } from '.';

const createMockRootVirtualizer = (
  overrides: Partial<CascadeVirtualizerReturnValue> = {}
): CascadeVirtualizerReturnValue => {
  const scrollElement = document.createElement('div');
  Object.defineProperty(scrollElement, 'clientHeight', { value: 600 });

  return {
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
  let controller: ChildVirtualizerController;
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

  describe('getChildConfig', () => {
    it('returns scrollMargin from root measurementsCache for the given row index', () => {
      const config = controller.getChildConfig(2);
      expect(config.scrollMargin).toBe(80);
    });

    it('returns 0 scrollMargin for unmeasured row indices', () => {
      const config = controller.getChildConfig(99);
      expect(config.scrollMargin).toBe(0);
    });

    it('returns the root scrollOffset as initialOffset', () => {
      const config = controller.getChildConfig(0);
      expect(config.initialOffset).toBe(500);
    });

    it('returns the root scrollElement via getScrollElement', () => {
      const config = controller.getChildConfig(0);
      expect(config.getScrollElement()).toBe(mockRoot.scrollElement);
    });

    it('returns null initialAnchorItemIndex when no persisted anchor exists', () => {
      const config = controller.getChildConfig(0);
      expect(config.initialAnchorItemIndex).toBeNull();
    });

    it('does not include observation overrides (children use default tanstack listeners)', () => {
      const config = controller.getChildConfig(0);
      expect(config).not.toHaveProperty('observeElementOffset');
      expect(config).not.toHaveProperty('observeElementRect');
    });
  });

  describe('getScrollMarginForRow', () => {
    it('returns the current start position from root measurementsCache', () => {
      expect(controller.getScrollMarginForRow(2)).toBe(80);
      expect(controller.getScrollMarginForRow(4)).toBe(560);
    });

    it('reflects updated measurements when root remeasures items', () => {
      expect(controller.getScrollMarginForRow(3)).toBe(320);

      (mockRoot as any).measurementsCache[3] = {
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

  describe('preRegister', () => {
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
      expect(controller.shouldActivate(2)).toBe(true);
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

    it('does not persist when scrollAnchorItemIndex is null', () => {
      const handle = controller.connect('cell-a', 2);
      handle.disconnect();

      expect(controller.getPersistedAnchor('cell-a')).toBeNull();
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

  describe('shouldActivate / isRootStable', () => {
    it('returns false before markRootStable is called', () => {
      expect(controller.isRootStable).toBe(false);
      expect(controller.shouldActivate(0)).toBe(false);
    });

    it('returns false immediately after markRootStable (before rAF)', () => {
      controller.connect('cell-a', 2);
      controller.markRootStable();
      expect(controller.isRootStable).toBe(true);
      expect(controller.shouldActivate(2)).toBe(false);
    });

    it('returns true after markRootStable and one rAF cycle', () => {
      controller.connect('cell-a', 2);
      controller.markRootStable();
      flushRaf();
      expect(controller.shouldActivate(2)).toBe(true);
    });
  });

  describe('staggered activation', () => {
    it('activates one child per rAF frame', () => {
      controller.connect('cell-a', 1);
      controller.connect('cell-b', 3);
      controller.connect('cell-c', 5);
      controller.markRootStable();

      expect(controller.shouldActivate(1)).toBe(false);
      expect(controller.shouldActivate(3)).toBe(false);
      expect(controller.shouldActivate(5)).toBe(false);

      flushRaf();
      const activatedAfterFrame1 = [1, 3, 5].filter((r) => controller.shouldActivate(r));
      expect(activatedAfterFrame1).toHaveLength(1);

      flushRaf();
      const activatedAfterFrame2 = [1, 3, 5].filter((r) => controller.shouldActivate(r));
      expect(activatedAfterFrame2).toHaveLength(2);

      flushRaf();
      const activatedAfterFrame3 = [1, 3, 5].filter((r) => controller.shouldActivate(r));
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
      expect(controller.shouldActivate(4)).toBe(true);
      expect(controller.shouldActivate(2)).toBe(false);
      expect(controller.shouldActivate(6)).toBe(false);

      flushRaf();
      expect(controller.shouldActivate(6)).toBe(true);
      expect(controller.shouldActivate(2)).toBe(false);

      flushRaf();
      expect(controller.shouldActivate(2)).toBe(true);
    });

    it('enforces activation budget cap', () => {
      const limitedController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        activationBudget: 2,
      });

      limitedController.connect('cell-a', 1);
      limitedController.connect('cell-b', 3);
      limitedController.connect('cell-c', 5);
      limitedController.markRootStable();

      flushRaf();
      flushRaf();
      flushRaf();

      const activatedCount = [1, 3, 5].filter((r) => limitedController.shouldActivate(r)).length;
      expect(activatedCount).toBe(2);

      limitedController.destroy();
    });

    it('frees budget when a child disconnects', () => {
      const limitedController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        activationBudget: 2,
      });

      const handleA = limitedController.connect('cell-a', 1);
      limitedController.connect('cell-b', 3);
      limitedController.connect('cell-c', 5);
      limitedController.markRootStable();

      flushRaf();
      flushRaf();
      flushRaf();

      let activatedCount = [1, 3, 5].filter((r) => limitedController.shouldActivate(r)).length;
      expect(activatedCount).toBe(2);

      handleA.disconnect();
      flushRaf();

      activatedCount = [3, 5].filter((r) => limitedController.shouldActivate(r)).length;
      expect(activatedCount).toBe(2);

      limitedController.destroy();
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

    it('suppresses reportState for one frame after reattach', () => {
      controller.markRootStable();
      flushRaf();
      const handle = controller.connect('cell-a', 2);
      flushRaf();
      handle.detachScrollElement();
      handle.reattachScrollElement();

      handle.reportState({ scrollOffset: 999 });
      const state = controller.getConnectedChildren().get('cell-a');
      expect(state?.scrollOffset).toBe(0);

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

    it('enqueue immediately activates a returning cell when root is stable', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      returningController.markRootStable();
      returningController.enqueue('cell-a', 2);

      expect(returningController.shouldActivate(2)).toBe(true);
      returningController.destroy();
    });

    it('enqueue does not immediately activate a returning cell when root is not stable', () => {
      const returningController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        initialPersistedAnchors: { 'cell-a': 5 },
      });
      returningController.enqueue('cell-a', 2);

      expect(returningController.shouldActivate(2)).toBe(false);
      returningController.destroy();
    });

    it('non-returning cells still go through staggered activation', () => {
      controller.markRootStable();
      controller.enqueue('cell-a', 2);

      expect(controller.shouldActivate(2)).toBe(false);

      flushRaf();
      expect(controller.shouldActivate(2)).toBe(true);
    });

    it('returning cells do not consume stagger budget from non-returning cells', () => {
      const limitedController = createChildVirtualizerController({
        getRootVirtualizer: () => mockRoot,
        activationBudget: 2,
        initialPersistedAnchors: { 'cell-returning': 5 },
      });

      limitedController.markRootStable();

      limitedController.enqueue('cell-returning', 2);
      expect(limitedController.shouldActivate(2)).toBe(true);

      limitedController.enqueue('cell-a', 4);
      limitedController.enqueue('cell-b', 6);
      flushRaf();
      flushRaf();

      const activatedNonReturning = [4, 6].filter((r) =>
        limitedController.shouldActivate(r)
      ).length;
      expect(activatedNonReturning).toBeGreaterThanOrEqual(1);

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

      expect(returningController.shouldActivate(2)).toBe(false);
      returningController.destroy();
    });
  });

  describe('destroy', () => {
    it('cancels pending rAF', () => {
      controller.connect('cell-a', 2);
      controller.markRootStable();
      controller.destroy();
      flushRaf();
      expect(controller.shouldActivate(2)).toBe(false);
    });
  });
});
