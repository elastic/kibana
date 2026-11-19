/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR } from '../lib/constants';
import { applySourceAttribute } from '../components/edit/library/eui_icon_cache';
import {
  reflowManagedStyle,
  reflowManagedText,
  restoreHiddenElement,
  collectStyleReflowDimensions,
  collectTextReflowDimensions,
} from './clone_element';
import { setImportant } from '../lib/dom/set_important';

/**
 * A forward style change descriptor produced by the edit modal.
 */
export interface StyleChange {
  element: HTMLElement;
  property: string;
  value: string;
}

/**
 * A forward text node change descriptor produced by the edit modal.
 */
export interface TextNodeChange {
  node: Text;
  text?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

/**
 * A forward media/attribute change descriptor produced by the edit modal.
 */
export interface MediaChange {
  element: Element;
  attribute: string;
  value: string;
}

/** A recorded inline style override (for undo). */
export interface StyleEdit {
  element: HTMLElement;
  property: string;
  original: string;
  /** The original CSS priority ('' or 'important'). */
  originalPriority: string;
}

/** A recorded text node change (for undo). */
export interface TextEdit {
  node: Text;
  original: string;
}

/** A recorded media/attribute change (for undo). */
export interface MediaEdit {
  element: Element;
  attribute: string;
  original: string;
}

/**
 * Revert all edits recorded in the given arrays and clear them.
 *
 * Exported for use by history executors that need to reverse edit
 * transactions independently of session lifecycle.
 */
/**
 * Revert edits and clear the arrays in-place.
 *
 * The arrays are intentionally mutated (set to length 0) rather than
 * replaced. This is a deliberate design choice: the `EditTransaction`
 * holds a reference to the same `undoRecords` arrays. On undo,
 * `revertEdits` drains them; on a subsequent redo, `applyEditChanges`
 * repopulates them via the same reference. This avoids needing to
 * swap array references on the transaction object between undo/redo
 * cycles. The tradeoff is that code must never hold a stale snapshot
 * of these arrays across an undo boundary.
 */
export const revertEdits = (
  styleEdits: StyleEdit[],
  textEdits: TextEdit[],
  mediaEdits: MediaEdit[]
): void => {
  for (const { element, property, original, originalPriority } of styleEdits) {
    if (original) {
      element.style.setProperty(property, original, originalPriority);
    } else {
      element.style.removeProperty(property);
    }
  }
  styleEdits.length = 0;

  for (const { node, original } of textEdits) {
    node.textContent = original;
  }
  textEdits.length = 0;

  for (const { element, attribute, original } of mediaEdits) {
    applySourceAttribute(element, attribute, original);
  }
  mediaEdits.length = 0;
};

/**
 * Apply a batch of style, text, and media changes to the DOM, recording
 * undo entries in the provided arrays. Shared by `editExecutor.apply` and
 * `useEditChangeTracker.applyEdits`.
 */
export const applyEditChanges = (
  styleChanges: StyleChange[],
  textChanges: TextNodeChange[],
  mediaChanges: MediaChange[],
  styleEdits: StyleEdit[],
  textEdits: TextEdit[],
  mediaEdits: MediaEdit[]
): void => {
  for (const { element, property, value } of styleChanges) {
    const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    const original = element.style.getPropertyValue(cssProp);
    const originalPriority = element.style.getPropertyPriority(cssProp);
    styleEdits.push({ element, property: cssProp, original, originalPriority });
    setImportant(element, cssProp, value);
    const managedRoot = element.closest(`[${DEVTOOL_MANAGED_ATTR}]`);
    if (managedRoot instanceof HTMLElement) {
      for (const d of collectStyleReflowDimensions(element, cssProp, managedRoot)) {
        styleEdits.push({
          element: d.element,
          property: d.property,
          original: d.value,
          originalPriority: d.priority,
        });
      }
    }
    reflowManagedStyle(element, cssProp);
  }

  for (const { node, text, color: textColor, fontSize, fontWeight } of textChanges) {
    if (text !== undefined) {
      textEdits.push({ node, original: node.textContent ?? '' });
      node.textContent = text;
    }
    const parent = node.parentElement;
    const needsReflow = text !== undefined || fontSize !== undefined || fontWeight !== undefined;
    const managedRoot = parent?.closest(`[${DEVTOOL_MANAGED_ATTR}]`);
    if (needsReflow && parent && managedRoot instanceof HTMLElement) {
      for (const d of collectTextReflowDimensions(parent, managedRoot)) {
        styleEdits.push({
          element: d.element,
          property: d.property,
          original: d.value,
          originalPriority: d.priority,
        });
      }
    }
    if (needsReflow) {
      reflowManagedText(parent);
    }
    if (textColor !== undefined && parent) {
      styleEdits.push({
        element: parent,
        property: 'color',
        original: parent.style.color,
        originalPriority: parent.style.getPropertyPriority('color'),
      });
      styleEdits.push({
        element: parent,
        property: '-webkit-text-fill-color',
        original: parent.style.getPropertyValue('-webkit-text-fill-color'),
        originalPriority: parent.style.getPropertyPriority('-webkit-text-fill-color'),
      });
      setImportant(parent, 'color', textColor);
      setImportant(parent, '-webkit-text-fill-color', textColor);
    }
    if (fontSize !== undefined && parent) {
      styleEdits.push({
        element: parent,
        property: 'font-size',
        original: parent.style.getPropertyValue('font-size'),
        originalPriority: parent.style.getPropertyPriority('font-size'),
      });
      setImportant(parent, 'font-size', fontSize);
    }
    if (fontWeight !== undefined && parent) {
      styleEdits.push({
        element: parent,
        property: 'font-weight',
        original: parent.style.getPropertyValue('font-weight'),
        originalPriority: parent.style.getPropertyPriority('font-weight'),
      });
      setImportant(parent, 'font-weight', fontWeight);
    }
  }

  for (const { element, attribute, value } of mediaChanges) {
    const original = element.getAttribute(attribute) ?? '';
    mediaEdits.push({ element, attribute, original });
    applySourceAttribute(element, attribute, value);
  }
};

/**
 * Tracks the editing state of a single managed element.
 */
export interface ElementSession {
  /** The visible, position-fixed element managed by the editor. */
  el: HTMLElement;
  /** Horizontal translate offset (px). */
  dx: number;
  /** Vertical translate offset (px). */
  dy: number;
  /** Width delta from resize operations. */
  dw: number;
  /** Height delta from resize operations. */
  dh: number;
  /** The element's bounding rect before any editing - used for snap calculations. */
  originalRect: DOMRect;
  /** True when this is a duplicate (no hidden original to restore on reset). */
  isDuplicate: boolean;
  /** The in-flow element whose layout position the clone tracks on resize. */
  referenceEl?: HTMLElement;
  /** When set, this element is a live React render (not a static clone). */
  liveReactElement?: { element: ReactElement; zIndex: number };

  /** Tracked style edits applied via the edit modal. */
  styleEdits: StyleEdit[];
  /** Tracked text node edits applied via the edit modal. */
  textEdits: TextEdit[];
  /** Tracked media/attribute edits applied via the edit modal. */
  mediaEdits: MediaEdit[];
  /** Tear-down callback for live React roots. Called on delete/reset. */
  cleanup?: () => void;
}

/**
 * Registry for managed elements. Keyed by the visible element.
 *
 * **Important**: sessions are keyed by the exact `HTMLElement` object
 * reference. Undo/redo transactions store the same reference so that
 * lookups succeed after an undo re-inserts the element. If any code
 * path recreates (rather than reuses) the DOM node, the session
 * lookup will silently miss.
 */
export class ElementRegistry {
  private readonly sessions = new Map<HTMLElement, ElementSession>();

  public get size(): number {
    return this.sessions.size;
  }

  /** Get a session by its visible element. */
  get(el: HTMLElement): ElementSession | undefined {
    return this.sessions.get(el);
  }

  set(session: ElementSession): void {
    this.sessions.set(session.el, session);
  }

  values(): IterableIterator<ElementSession> {
    return this.sessions.values();
  }

  has(el: HTMLElement): boolean {
    return this.sessions.has(el);
  }

  /** Remove a session from the registry without touching the DOM. */
  delete(session: ElementSession): void {
    this.sessions.delete(session.el);
  }

  /**
   * Whether a session's element should be removed from the DOM on cleanup.
   *
   * Sessions created by drag (clone + hidden original) or duplicate/insert
   * own their element - it must be removed. Edit-only sessions track an
   * in-place page element that was never cloned; removing it would destroy
   * the original page content.
   *
   * Convention: a session that has no `referenceEl` (no hidden original)
   * and is not a duplicate is an edit-only session on the page element itself.
   */
  private isOwnedElement(session: ElementSession): boolean {
    return session.isDuplicate || !!session.referenceEl;
  }

  /**
   * Reset all sessions: revert edits, remove owned elements, restore
   * hidden originals, and clear the registry.
   */
  resetAll(): void {
    for (const session of this.sessions.values()) {
      revertEdits(session.styleEdits, session.textEdits, session.mediaEdits);
      session.cleanup?.();
      if (this.isOwnedElement(session)) {
        session.el.remove();
      }
    }
    this.sessions.clear();

    const hidden = document.querySelectorAll<HTMLElement>(`[${DEVTOOL_HIDDEN_ATTR}]`);
    for (const el of hidden) {
      restoreHiddenElement(el);
    }
  }

  /**
   * Remove a session. Reverts edits and, for owned elements (clones /
   * duplicates / inserts), detaches the element from the DOM. Edit-only
   * sessions on in-place page elements are simply unregistered.
   */
  removeSession(session: ElementSession): void {
    revertEdits(session.styleEdits, session.textEdits, session.mediaEdits);
    session.cleanup?.();
    if (this.isOwnedElement(session)) {
      session.el.remove();
    }
    this.delete(session);
  }

  /**
   * Get or create a session for `el`. If no session exists, a lightweight
   * edit-only session is registered - the element is NOT cloned or hidden.
   */
  getOrCreate(el: HTMLElement): ElementSession {
    const existing = this.sessions.get(el);
    if (existing) return existing;

    const rect = el.getBoundingClientRect();
    const session: ElementSession = {
      el,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      originalRect: new DOMRect(rect.left, rect.top, rect.width, rect.height),
      isDuplicate: false,
      styleEdits: [],
      textEdits: [],
      mediaEdits: [],
    };
    this.set(session);
    return session;
  }
}
