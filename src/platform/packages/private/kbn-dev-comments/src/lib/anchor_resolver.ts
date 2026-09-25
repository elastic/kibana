/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementAnchor } from '../types';
import { isVisible, resolveAnchor, type ResolvedAnchor } from './anchor';

/**
 * How long a search that found nothing holds before the page is searched
 * again: each one scans the whole document once per locator, and a page that
 * is rendering changes many times a second.
 */
export const MISS_RETRY_MS = 250;

interface Entry {
  anchor: ElementAnchor;
  match: ResolvedAnchor | null;
  /** Layout tick at which `match` was last searched for or confirmed. */
  tick: number;
  /** When `match` was last searched for. */
  searchedAt: number;
}

export interface AnchorResolution {
  /** Where each anchor is, by id; null when its element is not on the page. */
  resolved: ReadonlyMap<string, ResolvedAnchor | null>;
  /** When to resolve again for the searches that were put off; undefined when none was. */
  retryAt?: number;
}

export interface AnchorResolver {
  /**
   * Where each anchor is at layout `tick`. An element found before is kept
   * while it is on the page and visible, without searching for it again. An
   * element that was not found is searched for again once the layout changed,
   * and at the earliest `MISS_RETRY_MS` after the previous search.
   */
  resolve(
    anchors: ReadonlyArray<{ id: string; anchor: ElementAnchor }>,
    context: { tick: number; now: number }
  ): AnchorResolution;
}

/** Resolves anchors across layout ticks, so that the cost of a tick is one check per element found rather than one document search per locator. */
export const createAnchorResolver = (): AnchorResolver => {
  const entries = new Map<string, Entry>();

  const search = (id: string, anchor: ElementAnchor, tick: number, now: number) => {
    const match = resolveAnchor(anchor);
    entries.set(id, { anchor, match, tick, searchedAt: now });
    return match;
  };

  return {
    resolve(anchors, { tick, now }) {
      const resolved = new Map<string, ResolvedAnchor | null>();
      let retryAt: number | undefined;

      anchors.forEach(({ id, anchor }) => {
        const entry = entries.get(id);
        if (!entry || entry.anchor !== anchor) {
          resolved.set(id, search(id, anchor, tick, now));
          return;
        }
        // Nothing changed on the page since this anchor was last looked at.
        if (entry.tick === tick) {
          resolved.set(id, entry.match);
          return;
        }
        if (entry.match) {
          const { element } = entry.match;
          if (element.isConnected && isVisible(element)) {
            entry.tick = tick;
            resolved.set(id, entry.match);
          } else {
            resolved.set(id, search(id, anchor, tick, now));
          }
          return;
        }
        if (now - entry.searchedAt < MISS_RETRY_MS) {
          // Left as it is, so that it is searched for at `retryAt` even if the layout is quiet by then.
          retryAt = Math.min(retryAt ?? Infinity, entry.searchedAt + MISS_RETRY_MS);
          resolved.set(id, null);
          return;
        }
        resolved.set(id, search(id, anchor, tick, now));
      });

      entries.forEach((_, id) => {
        if (!resolved.has(id)) {
          entries.delete(id);
        }
      });
      return { resolved, retryAt };
    },
  };
};
