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
import { MoveOverlay } from './move_overlay';
import { DEVELOPER_TOOLBAR_ID, DEVTOOL_CLONE_ATTR, MEASURE_OVERLAY_ID } from '../../lib/constants';

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

const firePointerMove = (x: number, y: number) => {
  const event = new PointerEvent('pointermove', {
    clientX: x,
    clientY: y,
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

  beforeEach(() => {
    setIsMoveMode = jest.fn();
    originalElementsFromPoint = document.elementsFromPoint;

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
    target.remove();
    // Clean up any clones
    document.querySelectorAll(`[${DEVTOOL_CLONE_ATTR}]`).forEach((el) => el.remove());
    // Clean up any injected style elements
    document.querySelectorAll('style').forEach((s) => {
      if (s.textContent?.includes('cursor:')) s.remove();
    });
  });

  const getClone = () => document.querySelector(`[${DEVTOOL_CLONE_ATTR}]`) as HTMLElement | null;

  it('should register and clean up event listeners', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should show hover outline when moving over a valid element', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

    act(() => {
      firePointerMove(75, 60);
    });

    const outline = document.querySelector('[data-test-subj="moveOverlayOutline"]');
    expect(outline).not.toBeInTheDocument();

    panel.remove();
  });

  it('should create a clone and hide original when dragging an element', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

    // Clone should be repositioned
    expect(clone!.style.left).toBe('70px'); // 50 + (95-75)
    expect(clone!.style.top).toBe('70px'); // 50 + (80-60)
  });

  it('should preserve original transform for reset', () => {
    target.style.transform = 'rotate(45deg)';
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

    act(() => {
      firePointerDown(75, 60);
    });

    act(() => {
      firePointerMove(85, 70);
    });

    const clone = getClone();
    expect(clone).toBeInTheDocument();
    expect(clone!.style.left).toBe('60px'); // 50 + 10
    expect(clone!.style.top).toBe('60px'); // 50 + 10

    act(() => {
      firePointerUp(85, 70);
    });

    // Moving after release should not change the clone's position
    act(() => {
      firePointerMove(200, 200);
    });

    expect(clone!.style.left).toBe('60px');
    expect(clone!.style.top).toBe('60px');
  });

  it('should allow re-dragging a previously moved element', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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
    expect(clone!.style.left).toBe('60px');
    expect(clone!.style.top).toBe('60px');

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

    expect(clone!.style.left).toBe('80px'); // 60 + (105-85)
    expect(clone!.style.top).toBe('80px'); // 60 + (90-70)
  });

  it('should exit move mode and reset transforms on Escape', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

    renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

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

  it('should clean up cursor style on unmount', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);

    const { unmount } = renderWithI18n(<MoveOverlay setIsMoveMode={setIsMoveMode} />);

    act(() => {
      firePointerMove(75, 60);
    });

    // Cursor style should be injected
    const stylesBefore = document.querySelectorAll('style');
    const cursorStyle = Array.from(stylesBefore).find((s) =>
      s.textContent?.includes('cursor: grab')
    );
    expect(cursorStyle).toBeTruthy();

    unmount();

    // Cursor style should be removed after unmount
    const stylesAfter = Array.from(document.querySelectorAll('style')).find((s) =>
      s.textContent?.includes('cursor: grab')
    );
    expect(stylesAfter).toBeFalsy();
  });
});
