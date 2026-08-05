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
 * `collectContainersWithMatch` drives *visible* auto-expansion: in-table search only sees rendered
 * DOM text, so when a term is active every collection whose subtree contains a matching value is
 * force-opened so the match renders and the grid can highlight it. A match hidden past a collection's
 * "show more" cap isn't surfaced — a deliberate simplification that keeps the rendered DOM bounded by
 * the existing caps. This runs only for the handful of on-screen cells.
 *
 * `getDocumentText` drives the *counting* pass. The grid counts matches by rendering every row's cell
 * off-screen on each keystroke; mounting the whole tree there is what makes the grid freeze on large
 * result sets. Instead the cell renders this cheap, memoised text blob, which carries the same
 * searchable content for the counter to walk at a fraction of the render cost.
 */

import { buildNodes, type JsonNode, type JsonValue } from './tree_model';

export const EMPTY_ID_SET: ReadonlySet<string> = new Set();

// The ids of every collection whose subtree contains the term — i.e. the nodes to force-open.
export const collectContainersWithMatch = (
  nodes: JsonNode[],
  termLower: string
): ReadonlySet<string> => {
  const matched = new Set<string>();
  const visit = (node: JsonNode): boolean => {
    if (node.kind === 'leaf') {
      return String(node.value).toLowerCase().includes(termLower);
    }

    let hasMatch = false;
    for (const child of node.children) {
      if (visit(child)) hasMatch = true;
    }
    if (hasMatch) matched.add(node.id);
    return hasMatch;
  };
  nodes.forEach(visit);
  return matched;
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
