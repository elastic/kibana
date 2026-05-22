/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { UndoRedoStack } from '../../../../lib/history/undo_redo_stack';
import type { StackEntry, UndoRedoSnapshot } from '../../../../lib/history/undo_redo_stack';
import type {
  DraftEdit,
  DraftStyleEdit,
  DraftTextEdit,
  DraftMediaEdit,
} from '../../../../lib/history/draft_history';
import { restoreDimensions, reflowAfterStyleChange } from '../../../../edit_engine/clone_element';
import type { DimensionRecord } from '../../../../edit_engine/clone_element';
import { setImportant } from '../../../../lib/dom/set_important';
import { applySourceAttribute } from '../../library/eui_icon_cache';

interface DraftEntry extends StackEntry {
  readonly type: 'edit';
}

/**
 * Apply a single draft edit to the preview clone (forward direction).
 */
const applyDraftEdit = (edit: DraftEdit): void => {
  switch (edit.type) {
    case 'style':
      applyStyleValue(edit.cloneElement, edit.property, edit.after);
      break;
    case 'text':
      applyTextValue(edit.cloneNode, edit.field, edit.after);
      break;
    case 'media':
      applyMediaValue(edit.cloneElement, edit.attribute, edit.after);
      break;
  }
};

/**
 * Reverse a single draft edit on the preview clone.
 */
const reverseDraftEdit = (edit: DraftEdit): void => {
  switch (edit.type) {
    case 'style':
      applyStyleValue(edit.cloneElement, edit.property, edit.before);
      break;
    case 'text':
      applyTextValue(edit.cloneNode, edit.field, edit.before);
      break;
    case 'media':
      applyMediaValue(edit.cloneElement, edit.attribute, edit.before);
      break;
  }
};

const applyStyleValue = (el: HTMLElement, property: string, value: string): void => {
  if (property === 'backgroundColor') {
    if (value) {
      el.style.backgroundColor = value;
    } else {
      el.style.removeProperty('background-color');
    }
  } else {
    setImportant(el, property, value);
  }
};

const applyTextValue = (node: Text, field: string, value: string): void => {
  if (field === 'text') {
    node.textContent = value;
    return;
  }
  const parent = node.parentElement;
  if (!parent) return;
  switch (field) {
    case 'color':
      setImportant(parent, 'color', value);
      setImportant(parent, '-webkit-text-fill-color', value);
      break;
    case 'fontSize':
      setImportant(parent, 'font-size', value);
      break;
    case 'fontWeight':
      setImportant(parent, 'font-weight', value);
      break;
  }
};

const applyMediaValue = (el: Element, attribute: string, value: string): void => {
  applySourceAttribute(el, attribute, value);
};

/**
 * Re-run style reflow side effects that cannot be represented by property removal alone.
 *
 * @param edit - The draft edit being reapplied during redo.
 * @returns Nothing.
 */
const reflowRedoEdit = (edit: DraftEdit): void => {
  if (edit.type === 'style' && edit.property === 'padding') {
    reflowAfterStyleChange(edit.cloneElement, edit.property, edit.reflowRoot);
  }
};

/**
 * Wraps draft edits in the shape expected by {@link UndoRedoStack}.
 *
 * The stack requires `type` and `label` fields. Reuses `type: 'edit'`
 * and stores the actual `DraftEdit` payload in a side map keyed by
 * transaction ID. This avoids polluting the generic transaction type
 * with draft-specific fields.
 */
export interface DraftHistoryResult {
  /** Push a new draft edit. Applies it to the preview and records it. */
  push: (edit: DraftEdit, dimensions?: DimensionRecord[]) => void;
  /** Push multiple edits as a single undo step. */
  pushBatch: (edits: DraftEdit[], dimensions?: DimensionRecord[]) => void;
  /** Undo the last draft edit. Returns the reversed edit, or `null` if empty. */
  undo: () => DraftEdit | null;
  /** Redo the last undone draft edit. Returns the re-applied edit, or `null` if empty. */
  redo: () => DraftEdit | null;
  /** Reactive snapshot (`canUndo`, `canRedo`, labels) for UI buttons. */
  state: UndoRedoSnapshot;
  /** Direct access to the edits map - used by `flattenDraftEdits` at save time. */
  edits: Map<number, DraftEdit[]>;
  /** IDs of transactions on the active (undo) stack, excluding undone entries. */
  activeIds: ReadonlySet<number>;
}

/**
 * Local undo/redo stack for the edit modal's draft session.
 *
 * Each individual change (color, dimension, text, media) is pushed as a
 * separate entry. Undo/redo applies or reverses individual changes on the
 * preview clone. When the user saves, the caller flattens the net effect
 * into a single bulk `EditTransaction` on the main stack.
 *
 * The stack is created once per modal mount and discarded on unmount.
 * Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z) should be wired to `undo`
 * and `redo` with `stopPropagation` to prevent the main overlay from
 * handling them.
 *
 * @returns Draft history controls including undo, redo, push, revert, and state.
 */
export const useDraftHistory = (): DraftHistoryResult => {
  const stackRef = useRef(new UndoRedoStack<DraftEntry>());
  const stack = stackRef.current;

  /** Side map: transaction ID → DraftEdit payload(s). */
  const editsRef = useRef(new Map<number, DraftEdit[]>());

  /** Side map: transaction ID → frozen dimensions removed by reflow. */
  const dimsRef = useRef(new Map<number, DimensionRecord[]>());

  const state: UndoRedoSnapshot = useSyncExternalStore(
    useCallback((cb: () => void) => stack.subscribe(cb), [stack]),
    useCallback(() => stack.getSnapshot(), [stack])
  );

  const push = useCallback(
    (edit: DraftEdit, dimensions?: DimensionRecord[]) => {
      applyDraftEdit(edit);
      const tx = stack.push({ type: 'edit', label: edit.label });
      editsRef.current.set(tx.id, [edit]);
      if (dimensions?.length) dimsRef.current.set(tx.id, dimensions);
    },
    [stack]
  );

  const pushBatch = useCallback(
    (batch: DraftEdit[], dimensions?: DimensionRecord[]) => {
      if (batch.length === 0) return;
      for (const edit of batch) applyDraftEdit(edit);
      const tx = stack.push({ type: 'edit', label: batch[0].label });
      editsRef.current.set(tx.id, batch);
      if (dimensions?.length) dimsRef.current.set(tx.id, dimensions);
    },
    [stack]
  );

  const undo = useCallback((): DraftEdit | null => {
    const tx = stack.undo();
    if (!tx) return null;
    const batch = editsRef.current.get(tx.id);
    if (batch) {
      for (let i = batch.length - 1; i >= 0; i--) reverseDraftEdit(batch[i]);
    }
    const dims = dimsRef.current.get(tx.id);
    if (dims) restoreDimensions(dims);
    return batch?.[0] ?? null;
  }, [stack]);

  const redo = useCallback((): DraftEdit | null => {
    const tx = stack.redo();
    if (!tx) return null;
    const batch = editsRef.current.get(tx.id);
    if (batch) {
      for (const edit of batch) applyDraftEdit(edit);
    }
    const dims = dimsRef.current.get(tx.id);
    if (dims) {
      for (const { element, property } of dims) {
        element.style.removeProperty(property);
      }
    }
    if (batch) {
      for (const edit of batch) reflowRedoEdit(edit);
    }
    return batch?.[0] ?? null;
  }, [stack]);

  return {
    push,
    pushBatch,
    undo,
    redo,
    state,
    edits: editsRef.current,
    get activeIds() {
      return stack.activeIds;
    },
  };
};

/**
 * Compute the net effect of all draft edits for a given edit type.
 *
 * For styles: returns one `{ element, property, value }` per unique
 * `(element, property)` pair - only the final value matters.
 *
 * For text: returns one `TextNodeChange` per unique original `Text` node.
 *
 * For media: returns one `MediaChange` per unique original `Element`.
 *
 * This function should be called at save time to produce the arrays
 * passed to `onSave`.
 */
export const flattenDraftEdits = (
  edits: Map<number, DraftEdit[]>,
  activeIds?: ReadonlySet<number>
): {
  styleEdits: DraftStyleEdit[];
  textEdits: DraftTextEdit[];
  mediaEdits: DraftMediaEdit[];
} => {
  const elementIds = new Map<Element, number>();
  const elementKey = (el: Element): number => {
    let id = elementIds.get(el);
    if (id === undefined) {
      id = elementIds.size + 1;
      elementIds.set(el, id);
    }
    return id;
  };

  const styleMap = new Map<string, DraftStyleEdit>();
  const textMap = new Map<string, DraftTextEdit>();
  const mediaMap = new Map<string, DraftMediaEdit>();

  // Invariant: Map.values() iterates in insertion order (ES2015+), which
  // matches chronological push order, so the first edit's `before` value
  // is preserved as the original state for each property key.
  for (const [id, batch] of edits.entries()) {
    if (activeIds && !activeIds.has(id)) continue;
    for (const edit of batch) {
      switch (edit.type) {
        case 'style': {
          const key = `${elementKey(edit.element)}::${edit.property}`;
          const existing = styleMap.get(key);
          // Keep the original "before" from the first edit for this key
          styleMap.set(key, {
            ...edit,
            before: existing?.before ?? edit.before,
          });
          break;
        }
        case 'text': {
          const key = `text::${edit.index}::${edit.field}`;
          const existing = textMap.get(key);
          textMap.set(key, {
            ...edit,
            before: existing?.before ?? edit.before,
          });
          break;
        }
        case 'media': {
          const key = `media::${edit.index}`;
          const existing = mediaMap.get(key);
          mediaMap.set(key, {
            ...edit,
            before: existing?.before ?? edit.before,
          });
          break;
        }
      }
    }
  }

  // Filter out no-op edits where the net effect is identity (before === after)
  const styleEdits = [...styleMap.values()].filter((e) => e.before !== e.after);
  const textEdits = [...textMap.values()].filter((e) => e.before !== e.after);
  const mediaEdits = [...mediaMap.values()].filter((e) => e.before !== e.after);

  return { styleEdits, textEdits, mediaEdits };
};
