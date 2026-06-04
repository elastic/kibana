/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Draft edit types for the edit modal's local undo/redo stack.
 *
 * A draft edit captures a single atomic change made inside the modal
 * (color, dimension, text, or media). Each edit stores enough information
 * to apply and reverse itself on the preview clone, and to be flattened
 * into the final `StyleChange` / `TextNodeChange` / `MediaChange` arrays
 * on save.
 *
 * The draft stack is independent of the main {@link UndoRedoStack} - it
 * only lives while the modal is open. On save, the net effect of all draft
 * edits is collapsed into a single {@link EditTransaction} on the main stack.
 */

/**
 * A style property change on an element (background-color, width, padding, etc.).
 */
export interface DraftStyleEdit {
  readonly type: 'style';
  readonly label: string;
  /** The original (page) element, used as the key for `StyleChange`. */
  readonly element: HTMLElement;
  /** The clone element in the preview, where the visual change is applied. */
  readonly cloneElement: HTMLElement;
  /** CSS property name (camelCase for `element.style`, kebab-case for `setImportant`). */
  readonly property: string;
  /** Value before this edit. */
  readonly before: string;
  /** Value after this edit. */
  readonly after: string;
  /** Preview boundary to use when re-running style reflow during redo. */
  readonly reflowRoot?: HTMLElement | null;
}

/**
 * A text node content or style change (text, color, font-size, font-weight).
 */
export interface DraftTextEdit {
  readonly type: 'text';
  readonly label: string;
  /** Index into the modal's `textNodeMap` array. */
  readonly index: number;
  /** The original Text node (used as the key for `TextNodeChange`). */
  readonly originalNode: Text;
  /** The clone Text node in the preview. */
  readonly cloneNode: Text;
  /** Which text property changed. */
  readonly field: 'text' | 'color' | 'fontSize' | 'fontWeight';
  /** Value before this edit. */
  readonly before: string;
  /** Value after this edit. */
  readonly after: string;
}

/**
 * A media/attribute change (img src, svg href, icon type).
 */
export interface DraftMediaEdit {
  readonly type: 'media';
  readonly label: string;
  /** Index into the modal's `mediaMap` array. */
  readonly index: number;
  /** The original element. */
  readonly originalElement: Element;
  /** The clone element in the preview. */
  readonly cloneElement: Element;
  /** Attribute name. */
  readonly attribute: string;
  /** Value before this edit. */
  readonly before: string;
  /** Value after this edit. */
  readonly after: string;
}

/** Discriminated union of all draft edit types. */
export type DraftEdit = DraftStyleEdit | DraftTextEdit | DraftMediaEdit;
