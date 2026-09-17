/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const LAYOUT_EVENTS = ['scroll', 'resize'] as const;
const SETTLE_EVENTS = ['transitionend', 'animationend'] as const;
const LAYOUT_ATTRIBUTES = ['class', 'style', 'hidden', 'aria-hidden', 'aria-expanded', 'open'];

export interface LayoutTracker {
  /** Listeners run at most once a frame, after the page scrolled, resized, mutated, or a watched element changed size. */
  subscribe(listener: () => void): () => void;
  /** Increments with every notification, for use as a memo key. */
  getTick(): number;
  /** Elements whose size changes should notify; elements not given again are no longer watched. */
  watch(elements: Iterable<Element>): void;
}

/** One set of document-wide observers, shared by everything in the layer that measures page elements. */
export const createLayoutTracker = (): LayoutTracker => {
  let tick = 0;
  let frame = 0;
  const listeners = new Set<() => void>();
  let mutationObserver: MutationObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  const watched = new Set<Element>();
  /** ResizeObserver reports every element once right after `observe`; only later reports are size changes. */
  const reported = new WeakSet<Element>();

  const bump = () => {
    if (frame) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      tick += 1;
      listeners.forEach((listener) => listener());
    });
  };

  const onResize = (entries: ResizeObserverEntry[]) => {
    let changed = false;
    entries.forEach(({ target }) => {
      if (reported.has(target)) {
        changed = true;
      } else {
        reported.add(target);
      }
    });
    if (changed) {
      bump();
    }
  };

  const start = () => {
    LAYOUT_EVENTS.forEach((type) => window.addEventListener(type, bump, true));
    SETTLE_EVENTS.forEach((type) => document.addEventListener(type, bump, true));
    mutationObserver = new MutationObserver(bump);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: LAYOUT_ATTRIBUTES,
    });
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize);
      watched.forEach((element) => resizeObserver?.observe(element));
    }
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    LAYOUT_EVENTS.forEach((type) => window.removeEventListener(type, bump, true));
    SETTLE_EVENTS.forEach((type) => document.removeEventListener(type, bump, true));
    mutationObserver?.disconnect();
    mutationObserver = undefined;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    watched.forEach((element) => reported.delete(element));
    watched.clear();
  };

  return {
    subscribe(listener) {
      if (listeners.size === 0) {
        start();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stop();
        }
      };
    },

    getTick: () => tick,

    watch(elements) {
      const next = new Set(elements);
      watched.forEach((element) => {
        if (!next.has(element)) {
          watched.delete(element);
          reported.delete(element);
          resizeObserver?.unobserve(element);
        }
      });
      next.forEach((element) => {
        if (!watched.has(element)) {
          watched.add(element);
          resizeObserver?.observe(element);
        }
      });
    },
  };
};
