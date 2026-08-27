/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildNodes,
  INITIAL_CHILDREN,
  MAX_SEARCH_REVEAL,
  ROOT_ID,
  type JsonNode,
  type JsonValue,
} from './tree_model';

export interface SearchMatches {
  /** Every collection whose subtree contains a match; auto-expanded so the match renders. */
  containers: ReadonlySet<string>;
  /**
   * The minimum number of children that list must reveal ("Show more") so a node containing a match
   * is visible. (Show X more..)
   */
  reveals: ReadonlyMap<string, number>;
}

export const EMPTY_SEARCH_MATCHES: SearchMatches = {
  containers: new Set(),
  reveals: new Map(),
};

const bumpReveal = (reveals: Map<string, number>, listId: string, index: number): void => {
  const needed = index + 1;
  if (
    needed > INITIAL_CHILDREN &&
    needed <= MAX_SEARCH_REVEAL &&
    needed > (reveals.get(listId) ?? 0)
  ) {
    reveals.set(listId, needed);
  }
};

const mergeReveals = (
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>
): ReadonlyMap<string, number> => {
  if (a.size === 0) return b;
  if (b.size === 0) return a;
  const merged = new Map(a);
  for (const [id, count] of b) {
    merged.set(id, Math.max(merged.get(id) ?? 0, count));
  }
  return merged;
};

/** Unions two auto-expand plans (search matches and pinned leaves) so both stay visible. */
export const mergeSearchMatches = (a: SearchMatches, b: SearchMatches): SearchMatches => {
  if (a.containers.size === 0 && a.reveals.size === 0) return b;
  if (b.containers.size === 0 && b.reveals.size === 0) return a;
  return {
    containers: new Set([...a.containers, ...b.containers]),
    reveals: mergeReveals(a.reveals, b.reveals),
  };
};

const documentTextCache = new WeakMap<object, string>();

/**
 * Collects the nodes that need to be expanded / revealed to display a search match.
 * Capped by MAX_SEARCH_REVEAL to prevent the DOM from blowing up.
 */
export const collectSearchMatches = (nodes: JsonNode[], termLower: string): SearchMatches => {
  const containers = new Set<string>();
  const reveals = new Map<string, number>();

  const visit = (node: JsonNode, listId: string, index: number): boolean => {
    const keyMatches = !node.isArrayItem && node.key.toLowerCase().includes(termLower);

    let hasMatch: boolean;
    if (node.kind === 'leaf') {
      hasMatch = keyMatches || String(node.value).toLowerCase().includes(termLower);
    } else {
      let descendantMatch = false;
      node.children.forEach((child, childIndex) => {
        if (visit(child, node.id, childIndex)) descendantMatch = true;
      });
      if (descendantMatch) containers.add(node.id);
      hasMatch = descendantMatch || keyMatches;
    }

    // Check if the node needs to be revealed.
    if (hasMatch) bumpReveal(reveals, listId, index);
    return hasMatch;
  };

  nodes.forEach((node, index) => visit(node, ROOT_ID, index));
  return { containers, reveals };
};

/**
 * Collects the nodes that need to be expanded / revealed so each pinned leaf is visible
 * in this document (ancestors open, pager budget lifted past the pinned index).
 */
export const collectPinnedMatches = (
  nodes: JsonNode[],
  pinnedNodeIds: ReadonlySet<string>
): SearchMatches => {
  if (pinnedNodeIds.size === 0) return EMPTY_SEARCH_MATCHES;

  const containers = new Set<string>();
  const reveals = new Map<string, number>();

  const visit = (node: JsonNode, listId: string, index: number): boolean => {
    let hasMatch = pinnedNodeIds.has(node.id);
    if (node.kind === 'collection') {
      let descendantMatch = false;
      node.children.forEach((child, childIndex) => {
        if (visit(child, node.id, childIndex)) descendantMatch = true;
      });
      if (descendantMatch) containers.add(node.id);
      hasMatch = descendantMatch || hasMatch;
    }
    if (hasMatch) bumpReveal(reveals, listId, index);
    return hasMatch;
  };

  nodes.forEach((node, index) => visit(node, ROOT_ID, index));
  return { containers, reveals };
};

/**
 * Creates a text representation of a json value with just its keys and primitive values.
 * Used for in-table search counting.
 * Cached in a WeakMap to avoid recalculating the same document text for repeated keystrokes.
 */
export const getDocumentText = (json: JsonValue): string => {
  if (typeof json !== 'object' || json === null) {
    return json === undefined ? '' : String(json);
  }
  const cached = documentTextCache.get(json);
  if (cached !== undefined) {
    return cached;
  }

  const parts: string[] = [];
  const visit = (node: JsonNode): void => {
    // Array items are positional, so only object fields contribute their key.
    if (!node.isArrayItem) {
      parts.push(node.key);
    }
    if (node.kind === 'leaf') {
      parts.push(node.value === null ? 'null' : String(node.value));
      return;
    }

    for (const child of node.children) {
      visit(child);
    }
  };
  buildNodes(json).forEach(visit);

  const text = parts.join('\n');
  documentTextCache.set(json, text);
  return text;
};
