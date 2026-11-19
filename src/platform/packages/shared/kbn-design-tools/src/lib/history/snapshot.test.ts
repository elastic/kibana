/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type { ElementSession } from '../../edit_engine/element_registry';
import { snapshotSession, restoreSession, captureOriginalStyles } from './snapshot';
import '../tests/mocks';

const makeSnapshotSession = (overrides: Partial<ElementSession> = {}): ElementSession => {
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
    mediaEdits: [],
    ...overrides,
  };
};

describe('snapshotSession', () => {
  it('should capture all positional state', () => {
    const session = makeSnapshotSession();
    const snap = snapshotSession(session);

    expect(snap.dx).toBe(10);
    expect(snap.dy).toBe(20);
    expect(snap.dw).toBe(30);
    expect(snap.dh).toBe(40);
  });

  it('should deep-copies originalRect', () => {
    const session = makeSnapshotSession();
    const snap = snapshotSession(session);

    expect(snap.originalRect.x).toBe(100);
    expect(snap.originalRect.width).toBe(300);
    // Verify it's a copy, not the same reference
    expect(snap.originalRect).not.toBe(session.originalRect);
  });

  it('should deep-copies edit arrays', () => {
    const session = makeSnapshotSession();
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

  it('should record DOM insertion point', () => {
    const parent = document.createElement('div');
    const sibling = document.createElement('span');
    const el = document.createElement('p');
    parent.appendChild(el);
    parent.appendChild(sibling);

    const session = makeSnapshotSession({ el });
    const snap = snapshotSession(session);

    expect(snap.parentNode).toBe(parent);
    expect(snap.nextSibling).toBe(sibling);
  });

  it('should preserve liveReactElement reference', () => {
    const liveReactElement = { element: {} as ReactElement, zIndex: 5 };
    const session = makeSnapshotSession({ liveReactElement });
    const snap = snapshotSession(session);

    expect(snap.liveReactElement).toBe(liveReactElement);
  });
});

describe('restoreSession', () => {
  it('should create a session with snapshot values', () => {
    const session = makeSnapshotSession();
    const snap = snapshotSession(session);
    const restored = restoreSession(snap);

    expect(restored.dx).toBe(10);
    expect(restored.dy).toBe(20);
    expect(restored.dw).toBe(30);
    expect(restored.dh).toBe(40);
    expect(restored.isDuplicate).toBe(false);
    expect(restored.el).toBe(session.el);
  });

  it('should deep-copies edit arrays from snapshot', () => {
    const session = makeSnapshotSession();
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
});

describe('captureOriginalStyles', () => {
  it('should capture all five style properties', () => {
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

  it('should capture empty strings for unset properties', () => {
    const el = document.createElement('div');
    const styles = captureOriginalStyles(el);

    expect(styles.transform).toBe('');
    expect(styles.visibility).toBe('');
    expect(styles.pointerEvents).toBe('');
    expect(styles.opacity).toBe('');
    expect(styles.transition).toBe('');
  });
});
