/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tracks the editing state of a single editable instance: its visual clone,
 * transform offsets, resize deltas, and original styles needed for reset.
 *
 * For regular elements, `el` is the original DOM node.
 * For duplicates, `el` is a real DOM element inserted into the page that
 * acts as an independent editable instance.
 */
export interface ElementSession {
  /** The editable DOM element — original or duplicate. */
  el: HTMLElement;
  /** The fixed-position clone visible on screen, or null before first interaction. */
  clone: HTMLElement | null;
  /** Horizontal translate offset (px). */
  dx: number;
  /** Vertical translate offset (px). */
  dy: number;
  /** Width delta from resize operations. */
  dw: number;
  /** Height delta from resize operations. */
  dh: number;
  /** The element's original inline transform value, restored on reset. */
  originalTransform: string;
  /** The element's bounding rect before any editing — used for snap calculations. */
  originalRect: DOMRect;
  /** True when `el` is a duplicate inserted into the DOM (should be removed on reset). */
  isDuplicate: boolean;
}

/**
 * Registry for elements being edited. Keyed by original element with a
 * secondary index by clone, so lookups from either direction are fast.
 */
export class ElementRegistry {
  private readonly byElement = new Map<HTMLElement, ElementSession>();
  private readonly byClone = new Map<HTMLElement, ElementSession>();

  public get size(): number {
    return this.byElement.size;
  }

  /** Get a session by the original element. */
  get(el: HTMLElement): ElementSession | undefined {
    return this.byElement.get(el);
  }

  /** Get a session by its clone element. */
  getByClone(clone: HTMLElement): ElementSession | undefined {
    return this.byClone.get(clone);
  }

  /** Find a session by either the original element or its clone. */
  find(el: HTMLElement): ElementSession | undefined {
    return this.byElement.get(el) ?? this.byClone.get(el);
  }

  /** Register or update a session. */
  set(session: ElementSession): void {
    this.byElement.set(session.el, session);
    if (session.clone) {
      this.byClone.set(session.clone, session);
    }
  }

  /** Update the clone reference for a session (maintains the clone index). */
  setClone(session: ElementSession, clone: HTMLElement | null): void {
    if (session.clone) {
      this.byClone.delete(session.clone);
    }
    session.clone = clone;
    if (clone) {
      this.byClone.set(clone, session);
    }
  }

  /** Iterate all sessions. */
  values(): IterableIterator<ElementSession> {
    return this.byElement.values();
  }

  /** Reset all sessions: restore original styles, remove clones/duplicates, clear registry. */
  resetAll(): void {
    for (const session of this.byElement.values()) {
      session.clone?.remove();
      if (session.isDuplicate) {
        // Duplicate elements are owned by the editor — remove from DOM entirely
        session.el.remove();
      } else {
        session.el.style.transform = session.originalTransform;
        session.el.style.visibility = '';
        session.el.style.pointerEvents = '';
      }
    }
    this.byElement.clear();
    this.byClone.clear();
  }

  /** Check if an element (original or clone) has been registered. */
  has(el: HTMLElement): boolean {
    return this.byElement.has(el) || this.byClone.has(el);
  }

  /** Remove a session from both indexes. */
  delete(session: ElementSession): void {
    this.byElement.delete(session.el);
    if (session.clone) {
      this.byClone.delete(session.clone);
    }
  }

  /**
   * Remove a session completely: detach clone from DOM, remove duplicate
   * elements, and restore original element styles. Returns the original
   * element for further cleanup (e.g. soft-delete).
   */
  removeSession(session: ElementSession): HTMLElement {
    session.clone?.remove();
    this.delete(session);

    if (session.isDuplicate) {
      session.el.remove();
    } else {
      session.el.style.pointerEvents = '';
      session.el.style.transform = session.originalTransform;
    }

    return session.el;
  }

  /**
   * Return a lightweight array for APIs that expect a list of tracked elements
   * (e.g. getElementUnder hit-testing).
   */
  toOffsetArray(): Array<{ el: HTMLElement; clone: HTMLElement | null }> {
    const result: Array<{ el: HTMLElement; clone: HTMLElement | null }> = [];
    for (const session of this.byElement.values()) {
      result.push({ el: session.el, clone: session.clone });
    }
    return result;
  }
}
