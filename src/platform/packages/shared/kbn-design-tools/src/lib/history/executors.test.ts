/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElementRegistry } from '../../edit_engine/element_registry';
import { DEVTOOL_HIDDEN_ATTR } from '../constants';
import { makeSession, makeSnapshot } from '../tests/helpers';
import {
  moveExecutor,
  resizeExecutor,
  editExecutor,
  duplicateExecutor,
  deleteExecutor,
  cloneExecutor,
  executeTransaction,
} from './executors';
import type {
  MoveTransaction,
  ResizeTransaction,
  EditTransaction,
  DuplicateTransaction,
  DeleteTransaction,
  CloneTransaction,
} from './transaction';
import '../tests/mocks';

const txBase = { id: 1, timestamp: Date.now(), label: 'test' };

describe('moveExecutor', () => {
  let registry: ElementRegistry;
  let el: HTMLElement;

  beforeEach(() => {
    registry = new ElementRegistry();
    el = document.createElement('div');
    el.style.transformOrigin = '0 0';
    document.body.appendChild(el);
    const session = makeSession({ el });
    registry.set(session);
  });

  it('should apply sets session dx/dy to after values', () => {
    const tx: MoveTransaction = {
      ...txBase,
      type: 'move',
      target: el,
      before: { dx: 0, dy: 0 },
      after: { dx: 50, dy: 75 },
    };

    moveExecutor.apply(tx, registry);
    const session = registry.get(el)!;
    expect(session.dx).toBe(50);
    expect(session.dy).toBe(75);
  });

  it('should reverse restores session dx/dy to before values', () => {
    const session = registry.get(el)!;
    session.dx = 50;
    session.dy = 75;

    const tx: MoveTransaction = {
      ...txBase,
      type: 'move',
      target: el,
      before: { dx: 0, dy: 0 },
      after: { dx: 50, dy: 75 },
    };

    moveExecutor.reverse(tx, registry);
    expect(session.dx).toBe(0);
    expect(session.dy).toBe(0);
  });

  it('should is a no-op when session is missing', () => {
    const tx: MoveTransaction = {
      ...txBase,
      type: 'move',
      target: document.createElement('span'),
      before: { dx: 0, dy: 0 },
      after: { dx: 10, dy: 10 },
    };

    expect(() => moveExecutor.apply(tx, registry)).not.toThrow();
    expect(() => moveExecutor.reverse(tx, registry)).not.toThrow();
  });
});

describe('resizeExecutor', () => {
  let registry: ElementRegistry;
  let el: HTMLElement;

  beforeEach(() => {
    registry = new ElementRegistry();
    el = document.createElement('div');
    document.body.appendChild(el);
    registry.set(makeSession({ el }));
  });

  it('should apply sets all four deltas', () => {
    const tx: ResizeTransaction = {
      ...txBase,
      type: 'resize',
      target: el,
      before: { dx: 0, dy: 0, dw: 0, dh: 0 },
      after: { dx: 5, dy: 10, dw: 100, dh: 50 },
    };

    resizeExecutor.apply(tx, registry);
    const session = registry.get(el)!;
    expect(session.dx).toBe(5);
    expect(session.dy).toBe(10);
    expect(session.dw).toBe(100);
    expect(session.dh).toBe(50);
  });

  it('should reverse restores all four deltas', () => {
    const session = registry.get(el)!;
    Object.assign(session, { dx: 5, dy: 10, dw: 100, dh: 50 });

    const tx: ResizeTransaction = {
      ...txBase,
      type: 'resize',
      target: el,
      before: { dx: 0, dy: 0, dw: 0, dh: 0 },
      after: { dx: 5, dy: 10, dw: 100, dh: 50 },
    };

    resizeExecutor.reverse(tx, registry);
    expect(session.dx).toBe(0);
    expect(session.dy).toBe(0);
    expect(session.dw).toBe(0);
    expect(session.dh).toBe(0);
  });
});

describe('editExecutor', () => {
  let registry: ElementRegistry;
  let el: HTMLElement;

  beforeEach(() => {
    registry = new ElementRegistry();
    el = document.createElement('div');
    document.body.appendChild(el);
    registry.set(makeSession({ el }));
  });

  it('should apply sets inline styles and populates undoRecords', () => {
    const tx: EditTransaction = {
      ...txBase,
      type: 'edit',
      target: el,
      styleChanges: [{ element: el, property: 'color', value: 'red' }],
      textChanges: [],
      mediaChanges: [],
      undoRecords: { styleEdits: [], textEdits: [], mediaEdits: [] },
    };

    editExecutor.apply(tx, registry);
    expect(el.style.color).toBe('red');
    expect(tx.undoRecords.styleEdits).toHaveLength(1);
    expect(tx.undoRecords.styleEdits[0].original).toBe('');
  });

  it('should reverse restores original values and clears undoRecords', () => {
    el.style.color = 'blue';
    const tx: EditTransaction = {
      ...txBase,
      type: 'edit',
      target: el,
      styleChanges: [{ element: el, property: 'color', value: 'red' }],
      textChanges: [],
      mediaChanges: [],
      undoRecords: { styleEdits: [], textEdits: [], mediaEdits: [] },
    };

    editExecutor.apply(tx, registry);
    expect(el.style.color).toBe('red');

    editExecutor.reverse(tx, registry);
    expect(tx.undoRecords.styleEdits).toHaveLength(0);
  });

  it('should handle source attribute changes', () => {
    el.setAttribute('aria-label', 'original');
    const tx: EditTransaction = {
      ...txBase,
      type: 'edit',
      target: el,
      styleChanges: [],
      textChanges: [],
      mediaChanges: [{ element: el, attribute: 'aria-label', value: 'updated' }],
      undoRecords: { styleEdits: [], textEdits: [], mediaEdits: [] },
    };

    editExecutor.apply(tx, registry);
    expect(el.getAttribute('aria-label')).toBe('updated');

    editExecutor.reverse(tx, registry);
  });
});

describe('duplicateExecutor', () => {
  let registry: ElementRegistry;

  beforeEach(() => {
    registry = new ElementRegistry();
  });

  it('should apply re-inserts element and registers session', () => {
    const el = document.createElement('div');
    const session = makeSession({ el, isDuplicate: true });
    const snapshot = makeSnapshot(session, document.body);

    const tx: DuplicateTransaction = {
      ...txBase,
      type: 'duplicate',
      element: el,
      sessionSnapshot: snapshot,
    };

    duplicateExecutor.apply(tx, registry);
    expect(el.parentNode).toBe(document.body);
    expect(registry.get(el)).toBeDefined();
  });

  it('should reverse removes element and unregisters session', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const session = makeSession({ el, isDuplicate: true });
    registry.set(session);

    const tx: DuplicateTransaction = {
      ...txBase,
      type: 'duplicate',
      element: el,
      sessionSnapshot: makeSnapshot(session),
    };

    duplicateExecutor.reverse(tx, registry);
    expect(el.parentNode).toBeNull();
    expect(registry.get(el)).toBeUndefined();
  });
});

describe('deleteExecutor', () => {
  let registry: ElementRegistry;

  beforeEach(() => {
    registry = new ElementRegistry();
  });

  it('should apply removes a managed element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const session = makeSession({ el, isDuplicate: true });
    registry.set(session);

    const tx: DeleteTransaction = {
      ...txBase,
      type: 'delete',
      element: el,
      sessionSnapshot: makeSnapshot(session),
    };

    deleteExecutor.apply(tx, registry);
    expect(el.parentNode).toBeNull();
    expect(registry.get(el)).toBeUndefined();
  });

  it('should reverse re-inserts a managed element', () => {
    const el = document.createElement('div');
    const session = makeSession({ el, isDuplicate: true });
    const snapshot = makeSnapshot(session, document.body);

    const tx: DeleteTransaction = {
      ...txBase,
      type: 'delete',
      element: el,
      sessionSnapshot: snapshot,
    };

    deleteExecutor.reverse(tx, registry);
    expect(el.parentNode).toBe(document.body);
    expect(registry.get(el)).toBeDefined();
  });

  it('should apply soft-hides an unmanaged element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const tx: DeleteTransaction = {
      ...txBase,
      type: 'delete',
      element: el,
      originalStyles: {
        transform: '',
        visibility: '',
        pointerEvents: '',
        opacity: '1',
        transition: '',
      },
    };

    deleteExecutor.apply(tx, registry);
    expect(el.style.visibility).toBe('hidden');
    expect(el.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(true);
  });

  it('should reverse restores an unmanaged element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.style.visibility = 'hidden';
    el.setAttribute(DEVTOOL_HIDDEN_ATTR, '');

    const tx: DeleteTransaction = {
      ...txBase,
      type: 'delete',
      element: el,
      originalStyles: {
        transform: '',
        visibility: 'visible',
        pointerEvents: 'auto',
        opacity: '1',
        transition: '',
      },
    };

    deleteExecutor.reverse(tx, registry);
    expect(el.style.visibility).toBe('visible');
    expect(el.style.pointerEvents).toBe('auto');
    expect(el.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
  });
});

describe('cloneExecutor', () => {
  let registry: ElementRegistry;

  beforeEach(() => {
    registry = new ElementRegistry();
  });

  it('should apply re-inserts clone and hides original', () => {
    const original = document.createElement('div');
    document.body.appendChild(original);
    const clone = document.createElement('div');
    const session = makeSession({ el: clone, referenceEl: original });
    const snapshot = makeSnapshot(session, document.body);

    const tx: CloneTransaction = {
      ...txBase,
      type: 'clone',
      element: clone,
      sessionSnapshot: snapshot,
      referenceEl: original,
    };

    cloneExecutor.apply(tx, registry);
    expect(clone.parentNode).toBe(document.body);
    expect(original.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(true);
    expect(original.style.visibility).toBe('hidden');
    expect(registry.get(clone)).toBeDefined();
  });

  it('should reverse removes clone and un-hides original', () => {
    const original = document.createElement('div');
    document.body.appendChild(original);
    original.setAttribute(DEVTOOL_HIDDEN_ATTR, '');
    original.style.visibility = 'hidden';

    const clone = document.createElement('div');
    document.body.appendChild(clone);
    const session = makeSession({ el: clone, referenceEl: original });
    registry.set(session);

    const tx: CloneTransaction = {
      ...txBase,
      type: 'clone',
      element: clone,
      sessionSnapshot: makeSnapshot(session),
      referenceEl: original,
    };

    cloneExecutor.reverse(tx, registry);
    expect(clone.parentNode).toBeNull();
    expect(original.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
    expect(original.style.visibility).toBe('');
    expect(registry.get(clone)).toBeUndefined();
  });
});

describe('executeTransaction', () => {
  it('should dispatch to the correct executor', () => {
    const registry = new ElementRegistry();
    const el = document.createElement('div');
    document.body.appendChild(el);
    registry.set(makeSession({ el }));

    const tx: MoveTransaction = {
      ...txBase,
      type: 'move',
      target: el,
      before: { dx: 0, dy: 0 },
      after: { dx: 30, dy: 40 },
    };

    executeTransaction(tx, registry, 'apply');
    expect(registry.get(el)!.dx).toBe(30);

    executeTransaction(tx, registry, 'reverse');
    expect(registry.get(el)!.dx).toBe(0);
  });
});
