/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { UndoRedoStack } from './undo_redo_stack';
export type { UndoRedoSnapshot } from './undo_redo_stack';

export type {
  Transaction,
  TransactionInput,
  TransactionBase,
  MoveTransaction,
  ResizeTransaction,
  EditTransaction,
  DuplicateTransaction,
  DeleteTransaction,
  CloneTransaction,
  ElementSessionSnapshot,
} from './transaction';

export { snapshotSession, restoreSession, captureOriginalStyles } from './snapshot';

export {
  moveExecutor,
  resizeExecutor,
  editExecutor,
  duplicateExecutor,
  deleteExecutor,
  cloneExecutor,
  executeTransaction,
} from './executors';
export type { TransactionExecutor } from './executors';
