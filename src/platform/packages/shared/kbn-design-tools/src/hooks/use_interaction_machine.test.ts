/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useInteractionMachine } from './use_interaction_machine';
import type { InteractionMachineOptions } from './use_interaction_machine';
import { ElementRegistry } from '../lib/dom/element_registry';
import { DEVTOOL_MANAGED_ATTR } from '../lib/constants';
import { getDefaultLayoutConfig } from '../lib/layout/layout_config';

// jsdom doesn't provide DOMRect
if (typeof globalThis.DOMRect === 'undefined') {
  const DOMRectPolyfill = function DOMRect(
    this: Record<string, number>,
    x = 0,
    y = 0,
    w = 0,
    h = 0
  ) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.top = y;
    this.right = x + w;
    this.bottom = y + h;
    this.left = x;
  } as unknown as typeof DOMRect;
  (globalThis as unknown as Record<string, unknown>).DOMRect = DOMRectPolyfill;
}

const layoutConfig = getDefaultLayoutConfig(16);

const makeOptions = (
  overrides: Partial<InteractionMachineOptions> = {}
): InteractionMachineOptions => {
  const registry = { current: new ElementRegistry() };
  return {
    registry,
    hoverTargetRef: { current: null },
    stickyHover: { current: null },
    roundedTargets: { current: new WeakSet() },
    rafId: { current: 0 },
    effects: {
      setCursor: jest.fn(),
      updateHoverTarget: jest.fn(),
      notifyCount: jest.fn(),
    },
    isInsideHoverLock: () => false,
    cloneZIndex: 1000,
    ...overrides,
  };
};

// jsdom doesn't provide PointerEvent — build from MouseEvent with pointerId
const makePointerEvent = (type: string, props: Partial<PointerEventInit> = {}): PointerEvent => {
  const event = new MouseEvent(type, {
    clientX: 0,
    clientY: 0,
    bubbles: true,
    ...props,
  });
  (event as unknown as Record<string, unknown>).pointerId = props.pointerId ?? 0;
  return event as unknown as PointerEvent;
};

describe('useInteractionMachine', () => {
  let originalRAF: typeof requestAnimationFrame;

  beforeEach(() => {
    originalRAF = window.requestAnimationFrame;
    // Flush rAF synchronously
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
    // Provide elementsFromPoint
    document.elementsFromPoint = jest.fn().mockReturnValue([]);
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRAF;
    document.body.innerHTML = '';
  });

  it('starts in idle state', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));
    expect(result.current.getState().type).toBe('idle');
  });

  it('transitions to pending-drag on pointer down over a targetable element', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });

    expect(result.current.getState().type).toBe('pending-drag');
  });

  it('does not transition to pending-drag when no element is under pointer', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });

    expect(result.current.getState().type).toBe('idle');
  });

  it('cancels pending-drag on pointer up (no drag committed)', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });
    expect(result.current.getState().type).toBe('pending-drag');

    act(() => {
      result.current.handlePointerUp(makePointerEvent('pointerup', { clientX: 51, clientY: 51 }));
    });
    expect(result.current.getState().type).toBe('idle');
  });

  it('promotes pending-drag to drag after 3px threshold', () => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => new DOMRect(50, 50, 100, 50);
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });
    expect(result.current.getState().type).toBe('pending-drag');

    // Move 10px — exceeds 3px threshold (sqrt(10²+10²) > 3)
    act(() => {
      result.current.handlePointerMove(
        makePointerEvent('pointermove', { clientX: 60, clientY: 60, shiftKey: true }),
        layoutConfig,
        false
      );
    });

    expect(result.current.getState().type).toBe('drag');
  });

  it('does not promote pending-drag below 3px threshold', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });

    // Move 1px — below threshold
    act(() => {
      result.current.handlePointerMove(
        makePointerEvent('pointermove', { clientX: 51, clientY: 51, shiftKey: true }),
        layoutConfig,
        false
      );
    });

    expect(result.current.getState().type).toBe('pending-drag');
  });

  it('abortDrag resets from pending-drag to idle', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });
    expect(result.current.getState().type).toBe('pending-drag');

    act(() => {
      result.current.abortDrag();
    });
    expect(result.current.getState().type).toBe('idle');
  });

  it('abortDrag resets from drag to idle and restores pointer-events', () => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => new DOMRect(50, 50, 100, 50);
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    // Enter drag state
    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });
    act(() => {
      result.current.handlePointerMove(
        makePointerEvent('pointermove', { clientX: 60, clientY: 60, shiftKey: true }),
        layoutConfig,
        false
      );
    });
    expect(result.current.getState().type).toBe('drag');

    act(() => {
      result.current.abortDrag();
    });
    expect(result.current.getState().type).toBe('idle');
  });

  it('forceIdle resets to idle from any state', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });
    expect(result.current.getState().type).toBe('pending-drag');

    act(() => {
      result.current.forceIdle();
    });
    expect(result.current.getState().type).toBe('idle');
  });

  it('startSessionDrag transitions directly to drag', () => {
    const el = document.createElement('div');
    el.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    el.getBoundingClientRect = () => new DOMRect(0, 0, 100, 50);
    document.body.appendChild(el);

    const opts = makeOptions();
    const session = {
      el,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      originalRect: new DOMRect(0, 0, 100, 50),
      isDuplicate: true,
      styleEdits: [],
      textEdits: [],
      sourceEdits: [],
    };

    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.startSessionDrag(session, 50, 25);
    });

    const state = result.current.getState();
    expect(state.type).toBe('drag');
    if (state.type === 'drag') {
      expect(state.session).toBe(session);
      expect(state.startX).toBe(50);
      expect(state.startY).toBe(25);
    }
  });

  it('parkInteraction transitions from drag to idle and sets cursor to grab', () => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => new DOMRect(50, 50, 100, 50);
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const effects = {
      setCursor: jest.fn(),
      updateHoverTarget: jest.fn(),
      notifyCount: jest.fn(),
    };
    const opts = makeOptions({ effects });
    const { result } = renderHook(() => useInteractionMachine(opts));

    // Enter drag
    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });
    act(() => {
      result.current.handlePointerMove(
        makePointerEvent('pointermove', { clientX: 60, clientY: 60, shiftKey: true }),
        layoutConfig,
        false
      );
    });
    expect(result.current.getState().type).toBe('drag');

    act(() => {
      result.current.parkInteraction();
    });

    expect(result.current.getState().type).toBe('idle');
    expect(effects.setCursor).toHaveBeenCalledWith('grab');
  });
});
