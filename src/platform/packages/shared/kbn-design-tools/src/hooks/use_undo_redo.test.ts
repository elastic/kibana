/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from './use_undo_redo';
import { ElementRegistry } from '../lib/dom/element_registry';
import type { ElementSession } from '../lib/dom/element_registry';

if (typeof globalThis.DOMRect === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).DOMRect = class DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    constructor(x = 0, y = 0, w = 0, h = 0) {
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
      this.top = y;
      this.right = x + w;
      this.bottom = y + h;
      this.left = x;
    }
    toJSON() {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
  };
}

const makeRegistry = () => {
  const registry = new ElementRegistry();
  return { current: registry };
};

const makeSession = (el: HTMLElement): ElementSession => ({
  el,
  dx: 0,
  dy: 0,
  dw: 0,
  dh: 0,
  originalRect: new DOMRect(0, 0, 100, 100),
  isDuplicate: false,
  styleEdits: [],
  textEdits: [],
  sourceEdits: [],
});

describe('useUndoRedo', () => {
  it('starts with empty state', () => {
    const registryRef = makeRegistry();
    const { result } = renderHook(() => useUndoRedo(registryRef));

    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.canRedo).toBe(false);
  });

  it('push makes canUndo true', () => {
    const registryRef = makeRegistry();
    const el = document.createElement('div');
    registryRef.current.set(makeSession(el));

    const { result } = renderHook(() => useUndoRedo(registryRef));

    act(() => {
      result.current.push({
        type: 'move',
        label: 'Move',
        target: el,
        before: { dx: 0, dy: 0 },
        after: { dx: 10, dy: 20 },
      });
    });

    expect(result.current.state.canUndo).toBe(true);
    expect(result.current.state.undoLabel).toBe('Move');
  });

  it('undo reverses the transaction and enables redo', () => {
    const registryRef = makeRegistry();
    const el = document.createElement('div');
    el.style.transformOrigin = '0 0';
    document.body.appendChild(el);
    const session = makeSession(el);
    session.dx = 10;
    session.dy = 20;
    registryRef.current.set(session);

    const { result } = renderHook(() => useUndoRedo(registryRef));

    act(() => {
      result.current.push({
        type: 'move',
        label: 'Move',
        target: el,
        before: { dx: 0, dy: 0 },
        after: { dx: 10, dy: 20 },
      });
    });

    act(() => {
      const undone = result.current.undo();
      expect(undone).toBe(true);
    });

    expect(session.dx).toBe(0);
    expect(session.dy).toBe(0);
    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.canRedo).toBe(true);
  });

  it('redo re-applies the transaction', () => {
    const registryRef = makeRegistry();
    const el = document.createElement('div');
    el.style.transformOrigin = '0 0';
    document.body.appendChild(el);
    const session = makeSession(el);
    registryRef.current.set(session);

    const { result } = renderHook(() => useUndoRedo(registryRef));

    act(() => {
      result.current.push({
        type: 'move',
        label: 'Move',
        target: el,
        before: { dx: 0, dy: 0 },
        after: { dx: 10, dy: 20 },
      });
    });

    act(() => result.current.undo());
    act(() => {
      const redone = result.current.redo();
      expect(redone).toBe(true);
    });

    expect(session.dx).toBe(10);
    expect(session.dy).toBe(20);
    expect(result.current.state.canUndo).toBe(true);
    expect(result.current.state.canRedo).toBe(false);
  });

  it('clear resets everything', () => {
    const registryRef = makeRegistry();
    const el = document.createElement('div');
    registryRef.current.set(makeSession(el));

    const { result } = renderHook(() => useUndoRedo(registryRef));

    act(() => {
      result.current.push({
        type: 'move',
        label: 'Move',
        target: el,
        before: { dx: 0, dy: 0 },
        after: { dx: 10, dy: 20 },
      });
    });

    act(() => result.current.clear());

    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.canRedo).toBe(false);
  });

  it('undo returns false when stack is empty', () => {
    const registryRef = makeRegistry();
    const { result } = renderHook(() => useUndoRedo(registryRef));

    act(() => {
      expect(result.current.undo()).toBe(false);
    });
  });

  it('redo returns false when stack is empty', () => {
    const registryRef = makeRegistry();
    const { result } = renderHook(() => useUndoRedo(registryRef));

    act(() => {
      expect(result.current.redo()).toBe(false);
    });
  });
});
