/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import {
  RowHeaderSlotsScrollSyncProvider,
  useRowHeaderSlotsScrollSync,
  type RowHeaderSlotsScrollSyncState,
} from '.';

let resizeObserverCallback: ResizeObserverCallback;
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();

  global.ResizeObserver = jest.fn((cb) => {
    resizeObserverCallback = cb;
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    };
  }) as unknown as typeof ResizeObserver;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Configures jsdom-unfriendly scroll properties on an element and installs a
 * scrollTo mock that updates scrollLeft synchronously.
 */
const configureMockElement = (
  el: HTMLDivElement,
  {
    scrollWidth = 200,
    clientWidth = 100,
    scrollLeft = 0,
  }: { scrollWidth?: number; clientWidth?: number; scrollLeft?: number } = {}
) => {
  let internalScrollLeft = scrollLeft;
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(el, 'scrollLeft', {
    get: () => internalScrollLeft,
    set: (v: number) => {
      internalScrollLeft = v;
    },
    configurable: true,
  });

  el.scrollTo = jest.fn((optsOrX?: ScrollToOptions | number) => {
    if (typeof optsOrX === 'object') {
      internalScrollLeft = optsOrX?.left ?? 0;
    } else if (typeof optsOrX === 'number') {
      internalScrollLeft = optsOrX;
    }
  });
};

/**
 * Sets scrollLeft and dispatches a native scroll event that propagates
 * through the capture phase to the provider's listener.
 */
const fireScrollEvent = (el: HTMLDivElement, scrollLeft: number) => {
  (el as { scrollLeft: number }).scrollLeft = scrollLeft;
  el.dispatchEvent(new Event('scroll', { bubbles: false }));
};

interface TestConsumerProps {
  id: string;
  scrollWidth?: number;
  clientWidth?: number;
}

const TestConsumer = ({ id, scrollWidth = 200, clientWidth = 100 }: TestConsumerProps) => {
  const slotsScrollSync = useRowHeaderSlotsScrollSync();
  const ref = useRef<HTMLDivElement>(null);
  const slotsScrollSyncState = useSyncExternalStore(
    slotsScrollSync.subscribe,
    slotsScrollSync.getSnapshot
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    configureMockElement(el, { scrollWidth, clientWidth });
    slotsScrollSync.register(el);
    return () => slotsScrollSync.unregister(el);
  }, [slotsScrollSync, scrollWidth, clientWidth]);

  const handleMouseEnter = useCallback(() => {
    if (ref.current) slotsScrollSync.notifyHover(ref.current);
  }, [slotsScrollSync]);

  return (
    <div
      ref={ref}
      data-test-subj={`container-${id}`}
      data-scrollable={String(slotsScrollSyncState.isScrollable)}
      data-can-scroll-left={String(slotsScrollSyncState.canScrollLeft)}
      data-can-scroll-right={String(slotsScrollSyncState.canScrollRight)}
      onMouseEnter={handleMouseEnter}
    />
  );
};

/**
 * Hovers over a container to populate cached dimensions (required for
 * scroll state computation). Mirrors the real mouseEnter → notifyHover flow.
 */
const hoverContainer = (testId: string) => {
  fireEvent.mouseEnter(screen.getByTestId(testId));
};

describe('RowHeaderSlotsScrollSyncProvider', () => {
  describe('useRowHeaderSlotsScrollSync', () => {
    it('throws when used outside a provider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const Orphan = () => {
        useRowHeaderSlotsScrollSync();
        return null;
      };
      expect(() => render(<Orphan />)).toThrow(
        'useRowHeaderSlotsScrollSync must be used within a RowHeaderSlotsScrollSyncProvider'
      );
      spy.mockRestore();
    });
  });

  describe('scroll state', () => {
    it('returns default state (not scrollable) before any scroll', () => {
      render(<TestConsumer id="a" />, {
        wrapper: RowHeaderSlotsScrollSyncProvider,
      });

      const el = screen.getByTestId('container-a');
      expect(el).toHaveAttribute('data-scrollable', 'false');
      expect(el).toHaveAttribute('data-can-scroll-left', 'false');
      expect(el).toHaveAttribute('data-can-scroll-right', 'false');
    });

    it('reports scrollable with canScrollRight at the start of overflowing content', () => {
      render(<TestConsumer id="a" scrollWidth={300} clientWidth={100} />, {
        wrapper: RowHeaderSlotsScrollSyncProvider,
      });

      hoverContainer('container-a');

      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 0);
      });

      const el = screen.getByTestId('container-a');
      expect(el).toHaveAttribute('data-scrollable', 'true');
      expect(el).toHaveAttribute('data-can-scroll-left', 'false');
      expect(el).toHaveAttribute('data-can-scroll-right', 'true');
    });

    it('reports canScrollLeft and canScrollRight when in the middle', () => {
      render(<TestConsumer id="a" scrollWidth={300} clientWidth={100} />, {
        wrapper: RowHeaderSlotsScrollSyncProvider,
      });

      hoverContainer('container-a');

      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 100);
      });

      const el = screen.getByTestId('container-a');
      expect(el).toHaveAttribute('data-scrollable', 'true');
      expect(el).toHaveAttribute('data-can-scroll-left', 'true');
      expect(el).toHaveAttribute('data-can-scroll-right', 'true');
    });

    it('reports canScrollRight false when scrolled to the end', () => {
      render(<TestConsumer id="a" scrollWidth={300} clientWidth={100} />, {
        wrapper: RowHeaderSlotsScrollSyncProvider,
      });

      hoverContainer('container-a');

      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 200);
      });

      const el = screen.getByTestId('container-a');
      expect(el).toHaveAttribute('data-scrollable', 'true');
      expect(el).toHaveAttribute('data-can-scroll-left', 'true');
      expect(el).toHaveAttribute('data-can-scroll-right', 'false');
    });

    it('reports not scrollable when content fits the viewport', () => {
      render(<TestConsumer id="a" scrollWidth={100} clientWidth={100} />, {
        wrapper: RowHeaderSlotsScrollSyncProvider,
      });

      hoverContainer('container-a');

      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 0);
      });

      expect(screen.getByTestId('container-a')).toHaveAttribute('data-scrollable', 'false');
    });
  });

  describe('scroll synchronization', () => {
    it('syncs scroll position to all registered containers', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="leader" />
          <TestConsumer id="follower-1" />
          <TestConsumer id="follower-2" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-leader');

      act(() => {
        fireScrollEvent(screen.getByTestId('container-leader'), 75);
      });

      expect(screen.getByTestId<HTMLDivElement>('container-follower-1').scrollLeft).toBe(75);
      expect(screen.getByTestId<HTMLDivElement>('container-follower-2').scrollLeft).toBe(75);
    });

    it('assigns current canonical position to newly registered containers', () => {
      const { rerender } = render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="original" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-original');

      act(() => {
        fireScrollEvent(screen.getByTestId('container-original'), 60);
      });

      rerender(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="original" />
          <TestConsumer id="late-joiner" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      expect((screen.getByTestId('container-late-joiner') as HTMLDivElement).scrollLeft).toBe(60);
    });

    it('stops syncing to unregistered containers', () => {
      const { rerender } = render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="a" />
          <TestConsumer id="b" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');

      rerender(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="a" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      // Scrolling after container-b is unmounted should not throw
      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 50);
      });
    });
  });

  describe('scroll leader pattern', () => {
    it('rejects scroll events from non-leader containers during an active gesture', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="leader" />
          <TestConsumer id="rival" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-leader');

      const leader = screen.getByTestId<HTMLDivElement>('container-leader');
      const rival = screen.getByTestId<HTMLDivElement>('container-rival');

      act(() => {
        fireScrollEvent(leader, 50);
      });

      // rival tries to scroll while leader lock is held — should be rejected
      act(() => {
        fireScrollEvent(rival, 999);
      });

      expect(leader.scrollLeft).toBe(50);
    });

    it('releases the leader lock after the 50ms timeout', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="first" />
          <TestConsumer id="second" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-first');

      const first = screen.getByTestId<HTMLDivElement>('container-first');
      const second = screen.getByTestId<HTMLDivElement>('container-second');

      act(() => {
        fireScrollEvent(first, 50);
      });

      // expire the leader lock
      act(() => {
        jest.advanceTimersByTime(60);
      });

      // second can now become leader
      act(() => {
        fireScrollEvent(second, 30);
      });

      expect(first.scrollLeft).toBe(30);
    });
  });

  describe('disableScrollSync', () => {
    it('prevents synchronization when true', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider disableScrollSync>
          <TestConsumer id="a" />
          <TestConsumer id="b" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');

      const b = screen.getByTestId('container-b');
      const scrollToSpy = b.scrollTo as jest.Mock;
      scrollToSpy.mockClear();

      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 50);
      });

      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });

  describe('ResizeObserver integration', () => {
    it('creates exactly one ResizeObserver instance', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="a" />
          <TestConsumer id="b" />
          <TestConsumer id="c" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      expect(global.ResizeObserver).toHaveBeenCalledTimes(1);
    });

    it('observes the element that receives mouseEnter', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="a" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');

      expect(mockObserve).toHaveBeenCalledTimes(1);
      expect(mockObserve).toHaveBeenCalledWith(screen.getByTestId('container-a'));
    });

    it('unobserves the previous element when hover moves to another', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="a" />
          <TestConsumer id="b" />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');
      const prevElement = screen.getByTestId('container-a');

      hoverContainer('container-b');

      expect(mockUnobserve).toHaveBeenCalledWith(prevElement);
      expect(mockObserve).toHaveBeenCalledWith(screen.getByTestId('container-b'));
    });

    it('updates scroll state when the resize callback fires', () => {
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <TestConsumer id="a" scrollWidth={100} clientWidth={100} />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');

      const el = screen.getByTestId('container-a');
      expect(el).toHaveAttribute('data-scrollable', 'false');

      // Simulate a resize that makes the content overflow
      Object.defineProperty(el, 'scrollWidth', { value: 300, configurable: true });
      Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });

      act(() => {
        resizeObserverCallback([], {} as ResizeObserver);
      });

      expect(el).toHaveAttribute('data-scrollable', 'true');
    });
  });

  describe('snapshot stability', () => {
    it('returns the same reference when state has not changed', () => {
      const snapshots: RowHeaderSlotsScrollSyncState[] = [];

      const SnapshotCollector = () => {
        const slotsScrollSync = useRowHeaderSlotsScrollSync();
        const snapshot = useSyncExternalStore(
          slotsScrollSync.subscribe,
          slotsScrollSync.getSnapshot
        );
        snapshots.push(snapshot);
        return null;
      };

      // Non-scrollable element (scrollWidth === clientWidth) so state stays default
      render(
        <RowHeaderSlotsScrollSyncProvider>
          <SnapshotCollector />
          <TestConsumer id="a" scrollWidth={100} clientWidth={100} />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');

      const before = snapshots[snapshots.length - 1];

      // Scroll event fires but booleans stay the same (not scrollable)
      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 0);
      });

      const after = snapshots[snapshots.length - 1];
      expect(before).toBe(after);
    });

    it('returns a new reference when booleans change', () => {
      const snapshots: RowHeaderSlotsScrollSyncState[] = [];

      const SnapshotCollector = () => {
        const slotsScrollSync = useRowHeaderSlotsScrollSync();
        const snapshot = useSyncExternalStore(
          slotsScrollSync.subscribe,
          slotsScrollSync.getSnapshot
        );
        snapshots.push(snapshot);
        return null;
      };

      render(
        <RowHeaderSlotsScrollSyncProvider>
          <SnapshotCollector />
          <TestConsumer id="a" scrollWidth={300} clientWidth={100} />
        </RowHeaderSlotsScrollSyncProvider>
      );

      hoverContainer('container-a');

      const before = snapshots[snapshots.length - 1];

      act(() => {
        fireScrollEvent(screen.getByTestId('container-a'), 50);
      });

      const after = snapshots[snapshots.length - 1];
      expect(before).not.toBe(after);
      expect(after.isScrollable).toBe(true);
    });
  });
});
