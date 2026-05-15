/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementSession } from '../dom/element_registry';
import { snapshotSession, restoreSession, captureOriginalStyles } from './snapshot';

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

const makeSession = (overrides: Partial<ElementSession> = {}): ElementSession => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return {
    el,
    dx: 10,
    dy: 20,
    dw: 30,
    dh: 40,
    originalRect: new DOMRect(100, 200, 300, 400),
    isDuplicate: false,
    styleEdits: [
      {
        element: el,
        property: 'color',
        original: 'red',
        originalPriority: '',
      },
    ],
    textEdits: [],
    sourceEdits: [],
    ...overrides,
  };
};

describe('snapshotSession', () => {
  it('captures all positional state', () => {
    const session = makeSession();
    const snap = snapshotSession(session);

    expect(snap.dx).toBe(10);
    expect(snap.dy).toBe(20);
    expect(snap.dw).toBe(30);
    expect(snap.dh).toBe(40);
  });

  it('deep-copies originalRect', () => {
    const session = makeSession();
    const snap = snapshotSession(session);

    expect(snap.originalRect.x).toBe(100);
    expect(snap.originalRect.width).toBe(300);
    // Verify it's a copy, not the same reference
    expect(snap.originalRect).not.toBe(session.originalRect);
  });

  it('deep-copies edit arrays', () => {
    const session = makeSession();
    const snap = snapshotSession(session);

    // Mutating the session shouldn't affect the snapshot
    session.styleEdits.push({
      element: session.el,
      property: 'background',
      original: 'blue',
      originalPriority: '',
    });

    expect(snap.styleEdits).toHaveLength(1);
    expect(session.styleEdits).toHaveLength(2);
  });

  it('records DOM insertion point', () => {
    const parent = document.createElement('div');
    const sibling = document.createElement('span');
    const el = document.createElement('p');
    parent.appendChild(el);
    parent.appendChild(sibling);

    const session = makeSession({ el });
    const snap = snapshotSession(session);

    expect(snap.parentNode).toBe(parent);
    expect(snap.nextSibling).toBe(sibling);
  });

  it('captures componentState as deep copy', () => {
    const state = [[true, 42], ['hello']];
    const session = makeSession({ componentState: state });
    const snap = snapshotSession(session);

    expect(snap.componentState).toEqual([[true, 42], ['hello']]);
    // Verify inner arrays are copies
    expect(snap.componentState![0]).not.toBe(state[0]);
  });

  it('preserves liveReactElement reference', () => {
    const liveReactElement = { element: {} as any, zIndex: 5 };
    const session = makeSession({ liveReactElement });
    const snap = snapshotSession(session);

    expect(snap.liveReactElement).toBe(liveReactElement);
  });
});

describe('restoreSession', () => {
  it('creates a session with snapshot values', () => {
    const session = makeSession();
    const snap = snapshotSession(session);
    const restored = restoreSession(snap);

    expect(restored.dx).toBe(10);
    expect(restored.dy).toBe(20);
    expect(restored.dw).toBe(30);
    expect(restored.dh).toBe(40);
    expect(restored.isDuplicate).toBe(false);
    expect(restored.el).toBe(session.el);
  });

  it('deep-copies edit arrays from snapshot', () => {
    const session = makeSession();
    const snap = snapshotSession(session);
    const restored = restoreSession(snap);

    // Mutating the restored session shouldn't affect the snapshot
    restored.styleEdits.push({
      element: session.el,
      property: 'margin',
      original: '0px',
      originalPriority: '',
    });

    expect(snap.styleEdits).toHaveLength(1);
    expect(restored.styleEdits).toHaveLength(2);
  });

  it('deep-copies componentState', () => {
    const state = [[true]];
    const session = makeSession({ componentState: state });
    const snap = snapshotSession(session);
    const restored = restoreSession(snap);

    expect(restored.componentState).toEqual([[true]]);
    expect(restored.componentState![0]).not.toBe(snap.componentState![0]);
  });
});

describe('captureOriginalStyles', () => {
  it('captures all five style properties', () => {
    const el = document.createElement('div');
    el.style.transform = 'translate(10px, 20px)';
    el.style.visibility = 'visible';
    el.style.pointerEvents = 'auto';
    el.style.opacity = '1';
    el.style.transition = 'opacity 120ms ease';

    const styles = captureOriginalStyles(el);

    expect(styles.transform).toBe('translate(10px, 20px)');
    expect(styles.visibility).toBe('visible');
    expect(styles.pointerEvents).toBe('auto');
    expect(styles.opacity).toBe('1');
    expect(styles.transition).toBe('opacity 120ms ease');
  });

  it('captures empty strings for unset properties', () => {
    const el = document.createElement('div');
    const styles = captureOriginalStyles(el);

    expect(styles.transform).toBe('');
    expect(styles.visibility).toBe('');
    expect(styles.pointerEvents).toBe('');
    expect(styles.opacity).toBe('');
    expect(styles.transition).toBe('');
  });
});
