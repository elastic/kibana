/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toPath, fromPath } from './element_path';
import type { ElementPath } from './element_path';
import type {
  SerializedSession,
  SerializedTransaction,
  SerializedSessionSnapshot,
  SerializedStyleChange,
  SerializedTextNodeChange,
  SerializedSourceChange,
  SerializedStyleEdit,
  SerializedTextEdit,
  SerializedSourceEdit,
  SerializedRect,
} from './types';
import type {
  Transaction,
  ElementSessionSnapshot,
  MoveTransaction,
  ResizeTransaction,
  EditTransaction,
  DuplicateTransaction,
  DeleteTransaction,
  CloneTransaction,
} from '../transaction';
import type {
  StyleEdit,
  TextEdit,
  SourceEdit,
  StyleChange,
  TextNodeChange,
  SourceChange,
} from '../../dom/element_registry';

/**
 * Find the index of a child node within its parent's childNodes.
 * Used to locate Text nodes for serialization (Text nodes don't have
 * structural selectors like elements do).
 */
const childIndex = (node: Node): number => {
  const parent = node.parentNode;
  if (!parent) return 0;
  return Array.from(parent.childNodes).indexOf(node as ChildNode);
};

/**
 * Resolve a Text node from a parent element path and child index.
 * Returns `null` if the parent can't be resolved or the child at that
 * index isn't a Text node.
 */
const resolveTextNode = (parentPath: ElementPath, idx: number): Text | null => {
  const { element } = fromPath(parentPath);
  if (!element) return null;
  const child = element.childNodes[idx];
  return child instanceof Text ? child : null;
};

const serializeRect = (rect: DOMRect): SerializedRect => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
});

const deserializeRect = (r: SerializedRect): DOMRect => new DOMRect(r.x, r.y, r.width, r.height);

const serializeStyleChange = (c: StyleChange): SerializedStyleChange => ({
  targetPath: toPath(c.element),
  property: c.property,
  value: c.value,
});

const serializeTextNodeChange = (c: TextNodeChange): SerializedTextNodeChange => ({
  parentPath: c.node.parentElement ? toPath(c.node.parentElement) : toPath(document.body),
  childIndex: childIndex(c.node),
  text: c.text,
  color: c.color,
  fontSize: c.fontSize,
  fontWeight: c.fontWeight,
});

const serializeSourceChange = (c: SourceChange): SerializedSourceChange => ({
  targetPath: toPath(c.element),
  attribute: c.attribute,
  value: c.value,
});

const serializeStyleEdit = (e: StyleEdit): SerializedStyleEdit => ({
  targetPath: toPath(e.element),
  property: e.property,
  original: e.original,
  originalPriority: e.originalPriority,
});

const serializeTextEdit = (e: TextEdit): SerializedTextEdit => ({
  parentPath: e.node.parentElement ? toPath(e.node.parentElement) : toPath(document.body),
  childIndex: childIndex(e.node),
  original: e.original,
});

const serializeSourceEdit = (e: SourceEdit): SerializedSourceEdit => ({
  targetPath: toPath(e.element),
  attribute: e.attribute,
  original: e.original,
});

const serializeSnapshot = (snap: ElementSessionSnapshot): SerializedSessionSnapshot => ({
  elPath: toPath(snap.el),
  dx: snap.dx,
  dy: snap.dy,
  dw: snap.dw,
  dh: snap.dh,
  originalRect: serializeRect(snap.originalRect),
  isDuplicate: snap.isDuplicate,
  referenceElPath: snap.referenceEl ? toPath(snap.referenceEl) : undefined,
  componentState: snap.componentState,
  parentPath: snap.parentNode instanceof Element ? toPath(snap.parentNode) : toPath(document.body),
  childIndex: snap.nextSibling ? childIndex(snap.nextSibling) : -1,
  styleEdits: snap.styleEdits.map(serializeStyleEdit),
  textEdits: snap.textEdits.map(serializeTextEdit),
  sourceEdits: snap.sourceEdits.map(serializeSourceEdit),
});

/**
 * Serialize a single runtime transaction into a portable form.
 * All DOM element references are replaced with {@link ElementPath}
 * descriptors.
 *
 * @param tx - The live transaction with DOM references.
 * @returns A JSON-safe transaction descriptor.
 */
export const serializeTransaction = (tx: Transaction): SerializedTransaction => {
  switch (tx.type) {
    case 'move':
      return {
        type: 'move',
        id: tx.id,
        timestamp: tx.timestamp,
        label: tx.label,
        targetPath: toPath(tx.target),
        before: tx.before,
        after: tx.after,
      };

    case 'resize':
      return {
        type: 'resize',
        id: tx.id,
        timestamp: tx.timestamp,
        label: tx.label,
        targetPath: toPath(tx.target),
        before: tx.before,
        after: tx.after,
      };

    case 'edit':
      return {
        type: 'edit',
        id: tx.id,
        timestamp: tx.timestamp,
        label: tx.label,
        targetPath: toPath(tx.target),
        styleChanges: tx.styleChanges.map(serializeStyleChange),
        textChanges: tx.textChanges.map(serializeTextNodeChange),
        sourceChanges: tx.sourceChanges.map(serializeSourceChange),
        undoRecords: {
          styleEdits: tx.undoRecords.styleEdits.map(serializeStyleEdit),
          textEdits: tx.undoRecords.textEdits.map(serializeTextEdit),
          sourceEdits: tx.undoRecords.sourceEdits.map(serializeSourceEdit),
        },
      };

    case 'duplicate':
      return {
        type: 'duplicate',
        id: tx.id,
        timestamp: tx.timestamp,
        label: tx.label,
        elPath: toPath(tx.element),
        sessionSnapshot: serializeSnapshot(tx.sessionSnapshot),
      };

    case 'delete':
      return {
        type: 'delete',
        id: tx.id,
        timestamp: tx.timestamp,
        label: tx.label,
        elPath: toPath(tx.element),
        sessionSnapshot: tx.sessionSnapshot ? serializeSnapshot(tx.sessionSnapshot) : undefined,
        originalStyles: tx.originalStyles,
      };

    case 'clone':
      return {
        type: 'clone',
        id: tx.id,
        timestamp: tx.timestamp,
        label: tx.label,
        elPath: toPath(tx.element),
        sessionSnapshot: serializeSnapshot(tx.sessionSnapshot),
        referenceElPath: toPath(tx.referenceEl),
      };
  }
};

/**
 * Result of deserializing a single transaction. If resolution failed
 * for any referenced element, `warnings` will contain descriptions.
 */
interface DeserializeResult {
  /** The live transaction, or `null` if critical elements couldn't resolve. */
  transaction: Transaction | null;
  /** Human-readable warnings about unresolved or mismatched elements. */
  warnings: string[];
}

/**
 * Attempt to resolve an element from a path, collecting warnings.
 * Returns `null` and pushes a warning if resolution fails.
 */
const resolveElement = (
  path: ElementPath,
  context: string,
  warnings: string[]
): HTMLElement | null => {
  const result = fromPath(path);
  if (!result.element) {
    warnings.push(`Could not resolve ${context}: selector "${path.selector}" matched nothing.`);
    return null;
  }
  if (!result.fingerprintMatch) {
    warnings.push(
      `Element for ${context} resolved by selector but fingerprint mismatch — content may have changed.`
    );
  }
  return result.element instanceof HTMLElement ? result.element : null;
};

const deserializeStyleChanges = (
  changes: SerializedStyleChange[],
  warnings: string[]
): StyleChange[] =>
  changes
    .map((c) => {
      const element = resolveElement(c.targetPath, `style change (${c.property})`, warnings);
      return element ? { element, property: c.property, value: c.value } : null;
    })
    .filter((c): c is StyleChange => c !== null);

const deserializeTextNodeChanges = (
  changes: SerializedTextNodeChange[],
  warnings: string[]
): TextNodeChange[] => {
  const result: TextNodeChange[] = [];
  for (const c of changes) {
    const node = resolveTextNode(c.parentPath, c.childIndex);
    if (!node) {
      warnings.push(`Could not resolve text node at child index ${c.childIndex}.`);
      continue;
    }
    result.push({
      node,
      text: c.text,
      color: c.color,
      fontSize: c.fontSize,
      fontWeight: c.fontWeight,
    });
  }
  return result;
};

const deserializeSourceChanges = (
  changes: SerializedSourceChange[],
  warnings: string[]
): SourceChange[] => {
  const result: SourceChange[] = [];
  for (const c of changes) {
    const element = resolveElement(c.targetPath, `source change (${c.attribute})`, warnings);
    if (element) {
      result.push({ element, attribute: c.attribute, value: c.value });
    }
  }
  return result;
};

const deserializeStyleEdits = (edits: SerializedStyleEdit[], warnings: string[]): StyleEdit[] =>
  edits
    .map((e) => {
      const element = resolveElement(e.targetPath, `style edit (${e.property})`, warnings);
      return element
        ? {
            element,
            property: e.property,
            original: e.original,
            originalPriority: e.originalPriority,
          }
        : null;
    })
    .filter((e): e is StyleEdit => e !== null);

const deserializeTextEdits = (edits: SerializedTextEdit[], warnings: string[]): TextEdit[] =>
  edits
    .map((e) => {
      const node = resolveTextNode(e.parentPath, e.childIndex);
      if (!node) {
        warnings.push(`Could not resolve text edit node at child index ${e.childIndex}.`);
        return null;
      }
      return { node, original: e.original };
    })
    .filter((e): e is TextEdit => e !== null);

const deserializeSourceEdits = (
  edits: SerializedSourceEdit[],
  warnings: string[]
): SourceEdit[] => {
  const result: SourceEdit[] = [];
  for (const e of edits) {
    const element = resolveElement(e.targetPath, `source edit (${e.attribute})`, warnings);
    if (element) {
      result.push({ element, attribute: e.attribute, original: e.original });
    }
  }
  return result;
};

const deserializeSnapshot = (
  snap: SerializedSessionSnapshot,
  warnings: string[]
): ElementSessionSnapshot | null => {
  const el = resolveElement(snap.elPath, 'snapshot element', warnings);
  if (!el) return null;

  const parentEl = resolveElement(snap.parentPath, 'snapshot parent', warnings);
  const parentNode: Node = parentEl ?? document.body;
  const nextSibling = snap.childIndex >= 0 ? parentNode.childNodes[snap.childIndex] ?? null : null;
  const referenceEl = snap.referenceElPath
    ? resolveElement(snap.referenceElPath, 'snapshot reference', warnings) ?? undefined
    : undefined;

  return {
    el,
    dx: snap.dx,
    dy: snap.dy,
    dw: snap.dw,
    dh: snap.dh,
    originalRect: deserializeRect(snap.originalRect),
    isDuplicate: snap.isDuplicate,
    referenceEl,
    componentState: snap.componentState,
    parentNode,
    nextSibling,
    styleEdits: deserializeStyleEdits(snap.styleEdits, warnings),
    textEdits: deserializeTextEdits(snap.textEdits, warnings),
    sourceEdits: deserializeSourceEdits(snap.sourceEdits, warnings),
  };
};

/**
 * Deserialize a move transaction.
 */
const deserializeMove = (
  stx: Extract<SerializedTransaction, { type: 'move' }>,
  warnings: string[]
): MoveTransaction | null => {
  const target = resolveElement(stx.targetPath, 'move target', warnings);
  if (!target) return null;
  return { ...stx, target };
};

/**
 * Deserialize a resize transaction.
 */
const deserializeResize = (
  stx: Extract<SerializedTransaction, { type: 'resize' }>,
  warnings: string[]
): ResizeTransaction | null => {
  const target = resolveElement(stx.targetPath, 'resize target', warnings);
  if (!target) return null;
  return { ...stx, target };
};

/**
 * Deserialize an edit transaction.
 */
const deserializeEdit = (
  stx: Extract<SerializedTransaction, { type: 'edit' }>,
  warnings: string[]
): EditTransaction | null => {
  const target = resolveElement(stx.targetPath, 'edit target', warnings);
  if (!target) return null;

  return {
    id: stx.id,
    timestamp: stx.timestamp,
    label: stx.label,
    type: 'edit',
    target,
    styleChanges: deserializeStyleChanges(stx.styleChanges, warnings),
    textChanges: deserializeTextNodeChanges(stx.textChanges, warnings),
    sourceChanges: deserializeSourceChanges(stx.sourceChanges, warnings),
    undoRecords: {
      styleEdits: deserializeStyleEdits(stx.undoRecords.styleEdits, warnings),
      textEdits: deserializeTextEdits(stx.undoRecords.textEdits, warnings),
      sourceEdits: deserializeSourceEdits(stx.undoRecords.sourceEdits, warnings),
    },
  };
};

/**
 * Deserialize a duplicate transaction.
 */
const deserializeDuplicate = (
  stx: Extract<SerializedTransaction, { type: 'duplicate' }>,
  warnings: string[]
): DuplicateTransaction | null => {
  const element = resolveElement(stx.elPath, 'duplicate element', warnings);
  if (!element) return null;
  const sessionSnapshot = deserializeSnapshot(stx.sessionSnapshot, warnings);
  if (!sessionSnapshot) return null;

  return {
    id: stx.id,
    timestamp: stx.timestamp,
    label: stx.label,
    type: 'duplicate',
    element,
    sessionSnapshot,
  };
};

/**
 * Deserialize a delete transaction.
 */
const deserializeDelete = (
  stx: Extract<SerializedTransaction, { type: 'delete' }>,
  warnings: string[]
): DeleteTransaction | null => {
  const element = resolveElement(stx.elPath, 'delete element', warnings);
  if (!element) return null;
  const sessionSnapshot = stx.sessionSnapshot
    ? deserializeSnapshot(stx.sessionSnapshot, warnings) ?? undefined
    : undefined;

  return {
    id: stx.id,
    timestamp: stx.timestamp,
    label: stx.label,
    type: 'delete',
    element,
    sessionSnapshot,
    originalStyles: stx.originalStyles,
  };
};

/**
 * Deserialize a clone transaction.
 */
const deserializeClone = (
  stx: Extract<SerializedTransaction, { type: 'clone' }>,
  warnings: string[]
): CloneTransaction | null => {
  const element = resolveElement(stx.elPath, 'clone element', warnings);
  if (!element) return null;
  const referenceEl = resolveElement(stx.referenceElPath, 'clone reference', warnings);
  if (!referenceEl) return null;
  const sessionSnapshot = deserializeSnapshot(stx.sessionSnapshot, warnings);
  if (!sessionSnapshot) return null;

  return {
    id: stx.id,
    timestamp: stx.timestamp,
    label: stx.label,
    type: 'clone',
    element,
    sessionSnapshot,
    referenceEl,
  };
};

/**
 * Deserialize a single serialized transaction back to a live
 * {@link Transaction} by resolving all element paths.
 *
 * @param stx - The serialized transaction.
 * @returns The live transaction and any resolution warnings.
 */
export const deserializeTransaction = (stx: SerializedTransaction): DeserializeResult => {
  const warnings: string[] = [];
  let transaction: Transaction | null = null;

  switch (stx.type) {
    case 'move':
      transaction = deserializeMove(stx, warnings);
      break;
    case 'resize':
      transaction = deserializeResize(stx, warnings);
      break;
    case 'edit':
      transaction = deserializeEdit(stx, warnings);
      break;
    case 'duplicate':
      transaction = deserializeDuplicate(stx, warnings);
      break;
    case 'delete':
      transaction = deserializeDelete(stx, warnings);
      break;
    case 'clone':
      transaction = deserializeClone(stx, warnings);
      break;
  }

  return { transaction, warnings };
};

/**
 * Serialize an array of transactions into a complete
 * {@link SerializedSession} that can be JSON-stringified.
 *
 * @param transactions - The live transactions to serialize.
 * @returns A portable session object.
 */
export const serializeSession = (transactions: Transaction[]): SerializedSession => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  pageUrl: window.location.href,
  transactions: transactions.map(serializeTransaction),
});

/**
 * Result of deserializing a full session.
 */
interface DeserializeSessionResult {
  /** Successfully resolved transactions (in order). */
  transactions: Transaction[];
  /** Warnings from all transactions combined. */
  warnings: string[];
  /** Number of transactions that could not be resolved. */
  failedCount: number;
}

/**
 * Deserialize a {@link SerializedSession} back to live transactions.
 *
 * Each transaction is resolved independently — if one fails, the others
 * can still succeed. Warnings and failure counts are reported so the UI
 * can surface them.
 *
 * @param session - The serialized session (parsed from JSON).
 * @returns Live transactions, warnings, and a failure count.
 */
export const deserializeSession = (session: SerializedSession): DeserializeSessionResult => {
  const transactions: Transaction[] = [];
  const warnings: string[] = [];
  let failedCount = 0;

  for (const stx of session.transactions) {
    const result = deserializeTransaction(stx);
    if (result.transaction) {
      transactions.push(result.transaction);
    } else {
      failedCount++;
    }
    warnings.push(...result.warnings);
  }

  return { transactions, warnings, failedCount };
};
