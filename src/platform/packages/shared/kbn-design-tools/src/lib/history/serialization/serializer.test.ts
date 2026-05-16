/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  serializeTransaction,
  deserializeTransaction,
  serializeSession,
  deserializeSession,
} from './serializer';
import type { MoveTransaction, EditTransaction, Transaction } from '../transaction';

describe('serializer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('serializeTransaction / deserializeTransaction roundtrip', () => {
    it('should roundtrip a move transaction', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const tx: MoveTransaction = {
        id: 1,
        timestamp: 1000,
        label: 'Move',
        type: 'move',
        target: el,
        before: { dx: 0, dy: 0 },
        after: { dx: 10, dy: 20 },
      };

      const serialized = serializeTransaction(tx);
      expect(serialized.type).toBe('move');
      expect(serialized.id).toBe(1);

      const { transaction, warnings } = deserializeTransaction(serialized);
      expect(transaction).not.toBeNull();
      expect(transaction!.type).toBe('move');
      expect((transaction as MoveTransaction).target).toBe(el);
      expect((transaction as MoveTransaction).before).toEqual({ dx: 0, dy: 0 });
      expect((transaction as MoveTransaction).after).toEqual({ dx: 10, dy: 20 });
      expect(warnings.length).toBe(0);
    });

    it('should roundtrip an edit transaction with style changes', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const tx: EditTransaction = {
        id: 2,
        timestamp: 2000,
        label: 'Edit',
        type: 'edit',
        target: el,
        styleChanges: [{ element: el, property: 'color', value: 'red' }],
        textChanges: [],
        sourceChanges: [],
        undoRecords: {
          styleEdits: [{ element: el, property: 'color', original: 'blue', originalPriority: '' }],
          textEdits: [],
          sourceEdits: [],
        },
      };

      const serialized = serializeTransaction(tx);
      const { transaction } = deserializeTransaction(serialized);
      expect(transaction).not.toBeNull();
      expect(transaction!.type).toBe('edit');
      expect((transaction as EditTransaction).styleChanges).toHaveLength(1);
      expect((transaction as EditTransaction).undoRecords.styleEdits).toHaveLength(1);
    });

    it('should report warnings when elements cannot be resolved', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const tx: MoveTransaction = {
        id: 3,
        timestamp: 3000,
        label: 'Move orphan',
        type: 'move',
        target: el,
        before: { dx: 0, dy: 0 },
        after: { dx: 5, dy: 5 },
      };

      const serialized = serializeTransaction(tx);
      document.body.innerHTML = '';

      const { transaction, warnings } = deserializeTransaction(serialized);
      expect(transaction).toBeNull();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('serializeSession / deserializeSession', () => {
    it('should roundtrip a full session', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const transactions: Transaction[] = [
        {
          id: 1,
          timestamp: 1000,
          label: 'Move',
          type: 'move',
          target: el,
          before: { dx: 0, dy: 0 },
          after: { dx: 10, dy: 20 },
        },
      ];

      const session = serializeSession(transactions);
      expect(session.version).toBe(1);
      expect(session.transactions).toHaveLength(1);

      const result = deserializeSession(session);
      expect(result.transactions).toHaveLength(1);
      expect(result.failedCount).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should report failed count for unresolvable transactions', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const session = serializeSession([
        {
          id: 1,
          timestamp: 1000,
          label: 'Move',
          type: 'move',
          target: el,
          before: { dx: 0, dy: 0 },
          after: { dx: 10, dy: 20 },
        },
      ]);

      document.body.innerHTML = '';
      const result = deserializeSession(session);
      expect(result.transactions).toHaveLength(0);
      expect(result.failedCount).toBe(1);
    });
  });
});
