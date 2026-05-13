/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_HIDDEN_ATTR } from '../constants';

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
   * Reset all sessions: remove managed elements, restore hidden originals,
   * and clear the registry.
   */
  resetAll(): void {
    for (const session of this.sessions.values()) {
      session.el.remove();
    }
    this.sessions.clear();

    const hidden = document.querySelectorAll<HTMLElement>(`[${DEVTOOL_HIDDEN_ATTR}]`);
    for (const el of hidden) {
      el.style.transform = el.getAttribute(DEVTOOL_HIDDEN_ATTR) ?? '';
      el.style.visibility = '';
      el.style.pointerEvents = '';
      el.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    }
  }

  /**
   * Remove a session and detach its element from the DOM.
   */
  removeSession(session: ElementSession): void {
    session.el.remove();
    this.delete(session);
  }
}
