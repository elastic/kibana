/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementPath } from './element_path';

/**
 * Portable version of a move/resize before/after payload.
 * Already plain numbers — no DOM references.
 */
export interface SerializedPositionPayload {
  readonly dx: number;
  readonly dy: number;
}

export interface SerializedSizePayload extends SerializedPositionPayload {
  readonly dw: number;
  readonly dh: number;
}

/**
 * Portable version of a style change — element reference replaced by
 * an {@link ElementPath}.
 */
export interface SerializedStyleChange {
  readonly targetPath: ElementPath;
  readonly property: string;
  readonly value: string;
}

/**
 * Portable version of a text node change. The Text node reference is
 * replaced by the path to its parent element plus its child index.
 */
export interface SerializedTextNodeChange {
  readonly parentPath: ElementPath;
  readonly childIndex: number;
  readonly text?: string;
  readonly color?: string;
  readonly fontSize?: string;
  readonly fontWeight?: string;
}

/**
 * Portable version of a source/attribute change — element reference
 * replaced by a path.
 */
export interface SerializedSourceChange {
  readonly targetPath: ElementPath;
  readonly attribute: string;
  readonly value: string;
}

/**
 * Portable version of a style undo record.
 */
export interface SerializedStyleEdit {
  readonly targetPath: ElementPath;
  readonly property: string;
  readonly original: string;
  readonly originalPriority: string;
}

/**
 * Portable version of a text undo record.
 */
export interface SerializedTextEdit {
  readonly parentPath: ElementPath;
  readonly childIndex: number;
  readonly original: string;
}

/**
 * Portable version of a source undo record.
 */
export interface SerializedSourceEdit {
  readonly targetPath: ElementPath;
  readonly attribute: string;
  readonly original: string;
}

/**
 * Portable rectangle — DOMRect has methods that don't serialize.
 */
export interface SerializedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Portable session snapshot. All DOM references replaced by paths.
 * Live React element data is included as-is (best-effort — primitive
 * hook state like `useState(false)` survives JSON; refs/callbacks
 * will be `null` after deserialization and must be re-created).
 */
export interface SerializedSessionSnapshot {
  readonly elPath: ElementPath;
  readonly dx: number;
  readonly dy: number;
  readonly dw: number;
  readonly dh: number;
  readonly originalRect: SerializedRect;
  readonly isDuplicate: boolean;
  readonly referenceElPath?: ElementPath;
  /** Component state is serialized best-effort (primitives only). */
  readonly componentState?: unknown[][];
  readonly parentPath: ElementPath;
  /** Index among parent's children for re-insertion ordering. */
  readonly childIndex: number;
  readonly styleEdits: SerializedStyleEdit[];
  readonly textEdits: SerializedTextEdit[];
  readonly sourceEdits: SerializedSourceEdit[];
}

/**
 * A fully portable transaction with no DOM references.
 * Discriminated by `type`, same as the runtime {@link Transaction}.
 */
export type SerializedTransaction =
  | SerializedMoveTransaction
  | SerializedResizeTransaction
  | SerializedEditTransaction
  | SerializedDuplicateTransaction
  | SerializedDeleteTransaction
  | SerializedCloneTransaction;

export interface SerializedTransactionBase {
  readonly id: number;
  readonly timestamp: number;
  readonly label: string;
}

export interface SerializedMoveTransaction extends SerializedTransactionBase {
  readonly type: 'move';
  readonly targetPath: ElementPath;
  readonly before: SerializedPositionPayload;
  readonly after: SerializedPositionPayload;
}

export interface SerializedResizeTransaction extends SerializedTransactionBase {
  readonly type: 'resize';
  readonly targetPath: ElementPath;
  readonly before: SerializedSizePayload;
  readonly after: SerializedSizePayload;
}

export interface SerializedEditTransaction extends SerializedTransactionBase {
  readonly type: 'edit';
  readonly targetPath: ElementPath;
  readonly styleChanges: SerializedStyleChange[];
  readonly textChanges: SerializedTextNodeChange[];
  readonly sourceChanges: SerializedSourceChange[];
  readonly undoRecords: {
    readonly styleEdits: SerializedStyleEdit[];
    readonly textEdits: SerializedTextEdit[];
    readonly sourceEdits: SerializedSourceEdit[];
  };
}

export interface SerializedDuplicateTransaction extends SerializedTransactionBase {
  readonly type: 'duplicate';
  readonly elPath: ElementPath;
  readonly sessionSnapshot: SerializedSessionSnapshot;
}

export interface SerializedDeleteTransaction extends SerializedTransactionBase {
  readonly type: 'delete';
  readonly elPath: ElementPath;
  readonly sessionSnapshot?: SerializedSessionSnapshot;
  readonly originalStyles?: {
    readonly transform: string;
    readonly visibility: string;
    readonly pointerEvents: string;
    readonly opacity: string;
    readonly transition: string;
  };
}

export interface SerializedCloneTransaction extends SerializedTransactionBase {
  readonly type: 'clone';
  readonly elPath: ElementPath;
  readonly sessionSnapshot: SerializedSessionSnapshot;
  readonly referenceElPath: ElementPath;
}

/**
 * Top-level container for a serialized editing session.
 * This is the JSON shape written to clipboard / file.
 */
export interface SerializedSession {
  /** Schema version for forward compatibility. */
  readonly version: 1;
  /** ISO timestamp of when the session was exported. */
  readonly exportedAt: string;
  /** The page URL at export time (for validation on import). */
  readonly pageUrl: string;
  /** Ordered list of transactions (oldest first). */
  readonly transactions: SerializedTransaction[];
}
