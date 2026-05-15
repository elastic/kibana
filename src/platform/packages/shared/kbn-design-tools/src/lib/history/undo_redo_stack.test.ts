/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UndoRedoStack } from './undo_redo_stack';
import type { TransactionInput } from './transaction';

const makeMove = (label = 'Move'): TransactionInput => ({
  type: 'move',
  label,
  target: document.createElement('div'),
  before: { dx: 0, dy: 0 },
  after: { dx: 10, dy: 20 },
});

const makeResize = (label = 'Resize'): TransactionInput => ({
  type: 'resize',
  label,
  target: document.createElement('div'),
  before: { dx: 0, dy: 0, dw: 0, dh: 0 },
  after: { dx: 5, dy: 5, dw: 50, dh: 30 },
});

describe('UndoRedoStack', () => {
  let stack: UndoRedoStack;

  beforeEach(() => {
    stack = new UndoRedoStack();
  });

  describe('initial state', () => {
    it('starts empty', () => {
      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
      expect(stack.undoLabel).toBeUndefined();
      expect(stack.redoLabel).toBeUndefined();
      expect(stack.undoSize).toBe(0);
      expect(stack.redoSize).toBe(0);
    });
  });

  describe('push', () => {
    it('assigns monotonic IDs and timestamps', () => {
      const tx1 = stack.push(makeMove('A'));
      const tx2 = stack.push(makeMove('B'));
      expect(tx1.id).toBe(1);
      expect(tx2.id).toBe(2);
      expect(tx1.timestamp).toBeLessThanOrEqual(tx2.timestamp);
    });

    it('makes the stack undoable', () => {
      stack.push(makeMove());
      expect(stack.canUndo).toBe(true);
      expect(stack.undoLabel).toBe('Move');
    });

    it('clears the redo stack on new push', () => {
      stack.push(makeMove('A'));
      stack.undo();
      expect(stack.canRedo).toBe(true);

      stack.push(makeMove('B'));
      expect(stack.canRedo).toBe(false);
      expect(stack.redoSize).toBe(0);
    });
  });

  describe('undo', () => {
    it('returns null when empty', () => {
      expect(stack.undo()).toBeNull();
    });

    it('returns the most recent transaction', () => {
      stack.push(makeMove('A'));
      stack.push(makeResize('B'));
      const tx = stack.undo();
      expect(tx?.label).toBe('B');
      expect(tx?.type).toBe('resize');
    });

    it('moves the transaction to the redo stack', () => {
      stack.push(makeMove('A'));
      stack.undo();
      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(true);
      expect(stack.redoLabel).toBe('A');
    });

    it('undoes in LIFO order', () => {
      stack.push(makeMove('A'));
      stack.push(makeMove('B'));
      stack.push(makeMove('C'));

      expect(stack.undo()?.label).toBe('C');
      expect(stack.undo()?.label).toBe('B');
      expect(stack.undo()?.label).toBe('A');
      expect(stack.undo()).toBeNull();
    });
  });

  describe('redo', () => {
    it('returns null when empty', () => {
      expect(stack.redo()).toBeNull();
    });

    it('returns the most recently undone transaction', () => {
      stack.push(makeMove('A'));
      stack.push(makeMove('B'));
      stack.undo();
      stack.undo();
      const tx = stack.redo();
      expect(tx?.label).toBe('A');
    });

    it('moves the transaction back to the undo stack', () => {
      stack.push(makeMove('A'));
      stack.undo();
      stack.redo();
      expect(stack.canUndo).toBe(true);
      expect(stack.canRedo).toBe(false);
    });
  });

  describe('clear', () => {
    it('empties both stacks', () => {
      stack.push(makeMove('A'));
      stack.push(makeMove('B'));
      stack.undo();
      stack.clear();

      expect(stack.canUndo).toBe(false);
      expect(stack.canRedo).toBe(false);
      expect(stack.undoSize).toBe(0);
      expect(stack.redoSize).toBe(0);
    });

    it('resets ID counter', () => {
      stack.push(makeMove());
      stack.clear();
      const tx = stack.push(makeMove());
      expect(tx.id).toBe(1);
    });
  });

  describe('getSnapshot', () => {
    it('returns current state as a plain object', () => {
      const snap = stack.getSnapshot();
      expect(snap).toEqual({
        canUndo: false,
        canRedo: false,
        undoLabel: undefined,
        redoLabel: undefined,
      });
    });

    it('reflects state after mutations', () => {
      stack.push(makeMove('X'));
      expect(stack.getSnapshot().canUndo).toBe(true);
      expect(stack.getSnapshot().undoLabel).toBe('X');
    });
  });

  describe('subscribe', () => {
    it('notifies on push', () => {
      const fn = jest.fn();
      stack.subscribe(fn);
      stack.push(makeMove());
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('notifies on undo', () => {
      stack.push(makeMove());
      const fn = jest.fn();
      stack.subscribe(fn);
      stack.undo();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('notifies on redo', () => {
      stack.push(makeMove());
      stack.undo();
      const fn = jest.fn();
      stack.subscribe(fn);
      stack.redo();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('notifies on clear', () => {
      stack.push(makeMove());
      const fn = jest.fn();
      stack.subscribe(fn);
      stack.clear();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops notifications', () => {
      const fn = jest.fn();
      const unsub = stack.subscribe(fn);
      unsub();
      stack.push(makeMove());
      expect(fn).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      stack.subscribe(fn1);
      stack.subscribe(fn2);
      stack.push(makeMove());
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });
});
