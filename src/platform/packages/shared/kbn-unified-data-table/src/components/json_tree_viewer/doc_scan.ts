/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * In-table search support for the JSON tree. Both helpers are the same depth-first `visit` over the
 * document's node tree (`buildNodes`); they differ only in what they collect.
 *
 * `collectSearchMatches` drives *visible* auto-expansion and auto-reveal: in-table search only sees
 * rendered DOM text, so when a term is active every collection whose subtree contains a matching
 * value is force-opened, and any list that would hide a match past its "show more" cap is revealed
 * far enough (up to `MAX_SEARCH_REVEAL`) for the match to render. This runs only for the handful of
 * on-screen cells.
 *
 * `getDocumentText` drives the *counting* pass. The grid counts matches by rendering every row's cell
 * off-screen on each keystroke; mounting the whole tree there is what makes the grid freeze on large
 * result sets. Instead the cell renders this cheap, memoised text blob, which carries the same
 * searchable content for the counter to walk at a fraction of the render cost.
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
   * is visible.
   */
  reveals: ReadonlyMap<string, number>;
}

export const EMPTY_SEARCH_MATCHES: SearchMatches = {
  containers: new Set(),
  reveals: new Map(),
};

/**
 * Collects the nodes that need to be expanded / revealed to display a search match.
 */
export const collectSearchMatches = (nodes: JsonNode[], termLower: string): SearchMatches => {
  const containers = new Set<string>();
  const reveals = new Map<string, number>();

  const bumpReveal = (listId: string, index: number) => {
    const needed = index + 1;
    if (
      needed > INITIAL_CHILDREN &&
      needed <= MAX_SEARCH_REVEAL &&
      needed > (reveals.get(listId) ?? 0)
    ) {
      reveals.set(listId, needed);
    }
  };

  const visit = (node: JsonNode, listId: string, index: number): boolean => {
    let hasMatch: boolean;
    if (node.kind === 'leaf') {
      hasMatch = String(node.value).toLowerCase().includes(termLower);
    } else {
      hasMatch = false;
      node.children.forEach((child, childIndex) => {
        if (visit(child, node.id, childIndex)) hasMatch = true;
      });
      if (hasMatch) containers.add(node.id);
    }

    // Check if the node needs to be revealed.
    if (hasMatch) bumpReveal(listId, index);
    return hasMatch;
  };

  nodes.forEach((node, index) => visit(node, ROOT_ID, index));
  return { containers, reveals };
};

// A '\n'-joined blob of a document's keys and primitive values, memoised in a WeakMap keyed by the
// (stable, per-row) document so repeated keystrokes reuse it. The '\n' separators stop a match from
// spanning two adjacent fields, mirroring how the rendered tree keeps each token in its own text node.
const documentTextCache = new WeakMap<object, string>();

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
