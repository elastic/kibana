/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { DEVTOOL_HIDDEN_ATTR } from '../constants';
import { replaceIconContent } from '../eui_icon_cache';

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

/** A recorded source/attribute change (for undo). */
export interface SourceEdit {
  element: Element;
  attribute: string;
  original: string;
}

/**
 * Revert all edits recorded in the given arrays and clear them.
 */
const revertEdits = (
  styleEdits: StyleEdit[],
  textEdits: TextEdit[],
  sourceEdits: SourceEdit[]
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

  for (const { element, attribute, original } of sourceEdits) {
    if (attribute === 'data-icon-type') {
      replaceIconContent(element, original);
    } else {
      element.setAttribute(attribute, original);
    }
  }
  sourceEdits.length = 0;
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
  /** The element's bounding rect before any editing — used for snap calculations. */
  originalRect: DOMRect;
  /** True when this is a duplicate (no hidden original to restore on reset). */
  isDuplicate: boolean;
  /** The in-flow element whose layout position the clone tracks on resize. */
  referenceEl?: HTMLElement;
  /** When set, this element is a live React render (not a static clone). */
  liveReactElement?: { element: ReactElement; zIndex: number };
  /** Snapshot of React hook state for live elements, used to restore state on duplicate. */
  componentState?: unknown[][];
  /** Tracked style edits applied via the edit modal. */
  styleEdits: StyleEdit[];
  /** Tracked text node edits applied via the edit modal. */
  textEdits: TextEdit[];
  /** Tracked source/attribute edits applied via the edit modal. */
  sourceEdits: SourceEdit[];
  /** Tear-down callback for live React roots. Called on delete/reset. */
  cleanup?: () => void;
}

/**
 * Registry for managed elements. Keyed by the visible element.
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
   * own their element — it must be removed. Edit-only sessions track an
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
      revertEdits(session.styleEdits, session.textEdits, session.sourceEdits);
      session.cleanup?.();
      if (this.isOwnedElement(session)) {
        session.el.remove();
      }
    }
    this.sessions.clear();

    const hidden = document.querySelectorAll<HTMLElement>(`[${DEVTOOL_HIDDEN_ATTR}]`);
    for (const el of hidden) {
      el.style.transform = el.getAttribute(DEVTOOL_HIDDEN_ATTR) ?? '';
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    }
  }

  /**
   * Remove a session. Reverts edits and, for owned elements (clones /
   * duplicates / inserts), detaches the element from the DOM. Edit-only
   * sessions on in-place page elements are simply unregistered.
   */
  removeSession(session: ElementSession): void {
    revertEdits(session.styleEdits, session.textEdits, session.sourceEdits);
    session.cleanup?.();
    if (this.isOwnedElement(session)) {
      session.el.remove();
    }
    this.delete(session);
  }

  /**
   * Get or create a session for `el`. If no session exists, a lightweight
   * edit-only session is registered — the element is NOT cloned or hidden.
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
      sourceEdits: [],
    };
    this.set(session);
    return session;
  }
}
