/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * In-table search support: auto-expand nodes that contain a match.
 *
 * In-table search only sees rendered DOM text, so a value inside a collapsed node is never counted,
 * highlighted, or reachable by next/prev. When a term is active we expand every collection whose
 * subtree contains it, so the match renders and the grid's own search machinery picks it up. A match
 * hidden past a collection's "show more" cap isn't surfaced — a deliberate simplification that keeps
 * the rendered DOM bounded by the existing caps rather than tracking per-collection reveal budgets.
 *
 * The grid counts matches by rendering EVERY row's cell in an offscreen pass on every keystroke, so
 * the per-row work must stay cheap. `getDocScan` memoises the built node tree plus a lowercased blob
 * of all leaf text in a module WeakMap keyed by the (stable, per-row) document, so the tree is built
 * once (not per keystroke) and a single substring check rules out a non-matching document before any
 * tree walk — only a matching document pays for `collectContainersWithMatch`.
 */

import { buildNodes, type JsonNode, type JsonValue } from './tree_model';

export const EMPTY_ID_SET: ReadonlySet<string> = new Set();

interface DocScan {
  nodes: JsonNode[];
  text: string;
}

const docScanCache = new WeakMap<object, DocScan>();

const buildDocScan = (json: JsonValue): DocScan => {
  const nodes = buildNodes(json);
  const parts: string[] = [];
  const collectText = (node: JsonNode) => {
    // Raw primitive leaves only; a React-node leaf (an ES-query highlight) has no raw text here.
    if (node.kind === 'leaf') {
      if (!node.rendered) parts.push(String(node.value).toLowerCase());
    } else {
      node.children.forEach(collectText);
    }
  };
  nodes.forEach(collectText);
  return { nodes, text: parts.join('\n') };
};

export const getDocScan = (json: JsonValue): DocScan => {
  if (typeof json !== 'object' || json === null) {
    return { nodes: buildNodes(json), text: '' };
  }
  const cached = docScanCache.get(json);
  if (cached) return cached;
  const scan = buildDocScan(json);
  docScanCache.set(json, scan);
  return scan;
};

// The ids of every collection whose subtree contains the term — i.e. the nodes to force-open.
export const collectContainersWithMatch = (
  nodes: JsonNode[],
  termLower: string
): ReadonlySet<string> => {
  const matched = new Set<string>();
  const visit = (node: JsonNode): boolean => {
    if (node.kind === 'leaf') {
      return !node.rendered && String(node.value).toLowerCase().includes(termLower);
    }
    // Visit every child (no early return) so all matching collections are recorded.
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
