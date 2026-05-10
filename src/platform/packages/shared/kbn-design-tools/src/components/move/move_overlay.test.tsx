/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { cleanup, act } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DEVELOPER_TOOLBAR_ID, DEVTOOL_CLONE_ATTR, MEASURE_OVERLAY_ID } from '../../lib/constants';
import { getDefaultLayoutConfig } from '../../lib/layout/layout_config';
import { MoveOverlay } from './move_overlay';

const defaultLayoutConfig = getDefaultLayoutConfig(16);

// jsdom doesn't provide PointerEvent — polyfill with MouseEvent
class PointerEventPolyfill extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, params: PointerEventInit = {}) {
    super(type, params);
    this.pointerId = params.pointerId ?? 0;
  }
}
if (typeof globalThis.PointerEvent === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
}

const firePointerMove = (x: number, y: number, shiftKey = true) => {
  const event = new PointerEvent('pointermove', {
    clientX: x,
    clientY: y,
    shiftKey,
    bubbles: true,
  });
  document.dispatchEvent(event);
};

const firePointerDown = (x: number, y: number) => {
  const event = new PointerEvent('pointerdown', {
    clientX: x,
    clientY: y,
    bubbles: true,
  });
  document.dispatchEvent(event);
};

const firePointerUp = (x: number, y: number) => {
  const event = new PointerEvent('pointerup', {
    clientX: x,
    clientY: y,
    bubbles: true,
  });
  document.dispatchEvent(event);
};

const fireKeydown = (key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  document.dispatchEvent(event);
};

describe('MoveOverlay', () => {
  let setIsMoveMode: jest.Mock;
  let target: HTMLDivElement;
  let originalElementsFromPoint: typeof document.elementsFromPoint;
  let originalRAF: typeof requestAnimationFrame;

  beforeEach(() => {
    setIsMoveMode = jest.fn();
    originalElementsFromPoint = document.elementsFromPoint;
    originalRAF = window.requestAnimationFrame;
    // Flush rAF synchronously so pointer-move assertions work immediately
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };

    target = document.createElement('div');
    target.setAttribute('data-test-subj', 'movableTarget');
    target.style.transform = '';
    target.getBoundingClientRect = () =>
      ({
        top: 50,
        left: 50,
        width: 100,
        height: 40,
        right: 150,
        bottom: 90,
        x: 50,
        y: 50,
        toJSON: () => {},
      } as DOMRect);
    document.body.appendChild(target);
  });

  afterEach(() => {
    cleanup();
    document.elementsFromPoint = originalElementsFromPoint;
    window.requestAnimationFrame = originalRAF;
    target.remove();
    // Clean up any clones
    document.querySelectorAll(`[${DEVTOOL_CLONE_ATTR}]`).forEach((el) => el.remove());
  });

  const getClone = () => document.querySelector(`[${DEVTOOL_CLONE_ATTR}]`) as HTMLElement | null;

  it('should register and clean up event listeners', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should show hover outline when moving over a valid element', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerMove(75, 60);
    });

    const outline = document.querySelector('[data-test-subj="moveOverlayOutline"]');
    expect(outline).toBeInTheDocument();
  });

  it('should not show hover outline over ignored elements', () => {
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;
    document.body.appendChild(toolbar);

    document.elementsFromPoint = jest.fn().mockReturnValue([toolbar, target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerMove(75, 60);
    });

    const outline = document.querySelector('[data-test-subj="moveOverlayOutline"]');
    expect(outline).not.toBeInTheDocument();

    toolbar.remove();
  });

  it('should not show hover outline over data-devtool-ignore elements', () => {
    const panel = document.createElement('div');
    panel.setAttribute('data-devtool-ignore', '');
    document.body.appendChild(panel);

    document.elementsFromPoint = jest.fn().mockReturnValue([panel, target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerMove(75, 60);
    });

    const outline = document.querySelector('[data-test-subj="moveOverlayOutline"]');
    expect(outline).not.toBeInTheDocument();

    panel.remove();
  });

  it('should create a clone and hide original when dragging an element', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });

    // Original should be hidden, clone should exist
    expect(target.style.visibility).toBe('hidden');
    const clone = getClone();
    expect(clone).toBeInTheDocument();

    act(() => {
      firePointerMove(95, 80);
    });

    // Clone should be repositioned via transform (base left/top stays at original rect)
    expect(clone!.style.transform).toBe('translate(20px, 20px)');
  });

  it('should preserve original transform for reset', () => {
    target.style.transform = 'rotate(45deg)';
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });

    act(() => {
      firePointerMove(95, 80);
    });

    // Original hidden, clone visible
    expect(target.style.visibility).toBe('hidden');
    expect(getClone()).toBeInTheDocument();

    act(() => {
      firePointerUp(95, 80);
    });

    act(() => {
      fireKeydown('Escape');
    });

    // After reset, original transform is restored and clone is removed
    expect(target.style.transform).toBe('rotate(45deg)');
    expect(target.style.visibility).toBe('');
    expect(getClone()).not.toBeInTheDocument();
  });

  it('should stop dragging on pointer up', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });

    act(() => {
      firePointerMove(85, 70);
    });

    const clone = getClone();
    expect(clone).toBeInTheDocument();
    expect(clone!.style.transform).toBe('translate(10px, 10px)');

    act(() => {
      firePointerUp(85, 70);
    });

    // Moving after release should not change the clone's position
    act(() => {
      firePointerMove(200, 200);
    });

    expect(clone!.style.transform).toBe('translate(10px, 10px)');
  });

  it('should allow re-dragging a previously moved element', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    // First drag: move 10,10
    act(() => {
      firePointerDown(75, 60);
    });
    act(() => {
      firePointerMove(85, 70);
    });
    act(() => {
      firePointerUp(85, 70);
    });

    const clone = getClone();
    expect(clone).toBeInTheDocument();
    expect(clone!.style.transform).toBe('translate(10px, 10px)');

    // Mock the clone's bounding rect for the re-grab (jsdom returns 0,0 by default)
    clone!.getBoundingClientRect = () =>
      ({
        top: 60,
        left: 60,
        width: 100,
        height: 40,
        right: 160,
        bottom: 100,
        x: 60,
        y: 60,
        toJSON: () => {},
      } as DOMRect);

    // Second drag: re-grab the clone
    // Mock elementsFromPoint to return the clone this time
    document.elementsFromPoint = jest.fn().mockReturnValue([clone]);

    act(() => {
      firePointerDown(85, 70);
    });
    act(() => {
      firePointerMove(105, 90);
    });

    // Total offset: base(10,10) + mouse delta(20,20) = (30,30)
    expect(clone!.style.transform).toBe('translate(30px, 30px)');
  });

  it('should exit move mode and reset transforms on Escape', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });
    act(() => {
      firePointerMove(95, 80);
    });
    act(() => {
      firePointerUp(95, 80);
    });

    expect(target.style.visibility).toBe('hidden');
    expect(getClone()).toBeInTheDocument();

    act(() => {
      fireKeydown('Escape');
    });

    // Original restored, clone removed
    expect(target.style.visibility).toBe('');
    expect(target.style.transform).toBe('');
    expect(getClone()).not.toBeInTheDocument();
    expect(setIsMoveMode).toHaveBeenCalledWith(false);
  });

  it('should not handle Escape when measure overlay is active', () => {
    const measureOverlay = document.createElement('div');
    measureOverlay.id = MEASURE_OVERLAY_ID;
    document.body.appendChild(measureOverlay);

    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });
    act(() => {
      firePointerMove(95, 80);
    });
    act(() => {
      firePointerUp(95, 80);
    });

    act(() => {
      fireKeydown('Escape');
    });

    // Should NOT exit move mode — measure overlay takes priority
    expect(setIsMoveMode).not.toHaveBeenCalled();
    // Clone should still exist, original still hidden
    expect(target.style.visibility).toBe('hidden');
    expect(getClone()).toBeInTheDocument();

    measureOverlay.remove();
  });

  it('should not interact with ignored elements on pointer down', () => {
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;
    document.body.appendChild(toolbar);

    document.elementsFromPoint = jest.fn().mockReturnValue([toolbar, target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    const preventDefault = jest.fn();
    const event = new PointerEvent('pointerdown', {
      clientX: 75,
      clientY: 60,
      bubbles: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: preventDefault });
    document.dispatchEvent(event);

    // Should not have intercepted the event
    expect(preventDefault).not.toHaveBeenCalled();
    expect(target.style.transform).toBe('');

    toolbar.remove();
  });

  it('should abort drag on window blur', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });

    expect(target.style.visibility).toBe('hidden');
    const clone = getClone();
    expect(clone).toBeInTheDocument();

    // Simulate window blur (alt-tab, focus loss)
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    // Drag should be aborted — clone stays in place with pointer events re-enabled
    expect(clone!.style.pointerEvents).toBe('auto');
  });

  it('should abort drag on visibilitychange to hidden', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(
      <MoveOverlay
        layoutConfig={defaultLayoutConfig}
        isLayoutVisible={false}
        setIsMoveMode={setIsMoveMode}
      />
    );

    act(() => {
      firePointerDown(75, 60);
    });

    const clone = getClone();
    expect(clone).toBeInTheDocument();

    // Simulate visibility change
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });

    // Drag should be aborted
    expect(clone!.style.pointerEvents).toBe('auto');
  });
});
