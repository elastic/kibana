/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '../lib/tests/mocks';
import { renderHook, act } from '@testing-library/react';
import { useInteractionMachine } from './use_interaction_machine';
import { DEVTOOL_MANAGED_ATTR } from '../lib/constants';
import { getDefaultLayoutConfig } from '../lib/layout/layout_config';
import { makePointerEvent, makeInteractionOptions } from '../lib/tests/helpers';

const layoutConfig = getDefaultLayoutConfig(16);

describe('useInteractionMachine', () => {
  let originalRAF: typeof requestAnimationFrame;

  beforeEach(() => {
    originalRAF = window.requestAnimationFrame;
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

  it('should start in idle state', () => {
    const opts = makeInteractionOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));
    expect(result.current.getState().type).toBe('idle');
  });

  it('should transition to pending-drag on pointer down over a targetable element', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });

    expect(result.current.getState().type).toBe('pending-drag');
  });

  it('should not transition to pending-drag when no element is under pointer', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([]);

    const opts = makeInteractionOptions();
    const { result } = renderHook(() => useInteractionMachine(opts));

    act(() => {
      result.current.handlePointerDown(
        makePointerEvent('pointerdown', { clientX: 50, clientY: 50 })
      );
    });

    expect(result.current.getState().type).toBe('idle');
  });

  it('should cancel pending-drag on pointer up (no drag committed)', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
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

  it('should promote pending-drag to drag after 3px threshold', () => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => new DOMRect(50, 50, 100, 50);
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
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

  it('should not promote pending-drag below 3px threshold', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
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

  it('should abortDrag resets from pending-drag to idle', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
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

  it('should abortDrag resets from drag to idle and restores pointer-events', () => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => new DOMRect(50, 50, 100, 50);
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
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

  it('should forceIdle resets to idle from any state', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const opts = makeInteractionOptions();
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

  it('should startSessionDrag transitions directly to drag', () => {
    const el = document.createElement('div');
    el.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    el.getBoundingClientRect = () => new DOMRect(0, 0, 100, 50);
    document.body.appendChild(el);

    const opts = makeInteractionOptions();
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
      mediaEdits: [],
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

  it('should parkInteraction transitions from drag to idle and sets cursor to grab', () => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => new DOMRect(50, 50, 100, 50);
    document.body.appendChild(target);
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const effects = {
      setCursor: jest.fn(),
      updateHoverTarget: jest.fn(),
      notifyCount: jest.fn(),
    };
    const opts = makeInteractionOptions({ effects });
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
