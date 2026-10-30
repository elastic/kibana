/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file contains the JSON tree's data model. Two important functions:
 *
 * `buildNodes()` gets the JSON document and transforms it into a Tree of JsonNodes,
 *  this makes every later operation easier.
 *
 * `buildRows()` transform the Tree of nodes into a flatten array of rows, ready to be rendered using an iteration.
 *  Here you will find all the logic of what data is rendered.
 */

import type { ReactNode } from 'react';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = Record<string, unknown> | unknown[] | JsonPrimitive | undefined;

// Each collection (root + every expanded node) renders at most this many children before a
// "Show N more" row appears; revealing bumps the collection's budget by CHILDREN_INCREMENT.
export const INITIAL_CHILDREN = 10;
export const CHILDREN_INCREMENT = 10;

// Upper bound on how far a search term may auto-reveal a single list.
// We need to put a limit to not blow up the DOM.
export const MAX_SEARCH_REVEAL = 100;

// Safety budget for bulk expansion (Expand all / recursive Cmd-click)
// indices-stats is a good index to test this limit.
export const MAX_RENDERED_NODES = 1000;

export const ROOT_ID = 'json-viewer-$root';

export const OPEN_BRACKET = { object: '{', array: '[' } as const;
export const CLOSE_BRACKET = { object: '}', array: ']' } as const;

export type CollectionType = 'object' | 'array';
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null';

export interface CollectionNode {
  id: string;
  key: string;
  isArrayItem: boolean;
  kind: 'collection';
  collectionType: CollectionType;
  children: JsonNode[];
}

export interface LeafNode {
  id: string;
  key: string;
  isArrayItem: boolean;
  kind: 'leaf';
  primitiveType: PrimitiveType;
  value: JsonPrimitive;
  path: readonly string[];
}

export type JsonNode = CollectionNode | LeafNode;

export type FormatValue = (leaf: { value: JsonPrimitive; path: readonly string[] }) => ReactNode;

/** A trailing action rendered at the end of a leaf row (e.g. a filter button). */
export interface JsonTreeRowAction {
  id: string;
  iconType: string;
  /** Used as both the aria-label and the tooltip. */
  label: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

/** Called for each leaf row to build its actions (e.g. filter buttons). Hosts define the concrete actions. */
export type GetLeafActions = (leaf: {
  value: JsonPrimitive;
  path: readonly string[];
  /** True when the leaf is a direct element of an array (i.e. a multi-value field entry). */
  isArrayItem: boolean;
}) => JsonTreeRowAction[];

/**
 * Turns a json document into a Nodes tree. Each node contains all the
 * metadata needed to perform operations in an easy way.
 */
export const buildNodes = (json: JsonValue): JsonNode[] => {
  if (Array.isArray(json)) {
    return Array.from(json, (value, index) =>
      buildNode({ key: String(index), path: [String(index)], value, isArrayItem: true })
    );
  }
  if (isJsonObject(json)) {
    return Object.entries(json).map(([key, value]) =>
      buildNode({ key, path: [key], value, isArrayItem: false })
    );
  }
  return [buildNode({ key: 'value', path: ['value'], value: json, isArrayItem: false })];
};

const buildNode = ({
  key,
  path,
  value,
  isArrayItem,
}: {
  key: string;
  path: string[];
  value: unknown;
  isArrayItem: boolean;
}): JsonNode => {
  if (Array.isArray(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'collection',
      collectionType: 'array',
      children: Array.from(value, (child, index) =>
        buildNode({
          key: String(index),
          path: [...path, String(index)],
          value: child,
          isArrayItem: true,
        })
      ),
    };
  }

  if (isJsonObject(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'collection',
      collectionType: 'object',
      children: Object.entries(value).map(([childKey, childValue]) =>
        buildNode({
          key: childKey,
          path: [...path, childKey],
          value: childValue,
          isArrayItem: false,
        })
      ),
    };
  }

  return {
    id: getNodeId(path),
    key,
    isArrayItem,
    kind: 'leaf',
    primitiveType: getPrimitiveType(value),
    value: normalizePrimitive(value),
    path,
  };
};

// ---- Flatten visible rows (drives rendering order and keyboard navigation) ----
export interface NodeRow {
  kind: 'node';
  node: JsonNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  trailingComma: boolean;
  parentId: string | null;
  setSize: number;
  posInSet: number;
}

// Closing bracket row '}' or ']'
export interface ClosingRow {
  kind: 'closing';
  id: string;
  depth: number;
  collectionType: CollectionType;
  trailingComma: boolean;
}

// "Show N more" / "Show fewer" row
export interface PagerRow {
  kind: 'pager';
  id: string;
  depth: number;
  parentId: string | null;
  collectionId: string;
  collectionType: CollectionType;
  hiddenCount: number;
  totalCount: number;
  canShowFewer: boolean;
}

export type RenderRow = NodeRow | ClosingRow | PagerRow;

/**
 * Given a tree of nodes, flatten it into a list of rows, ready to be rendered.
 * Here lives the logic that determines which rows are visible and which are hidden;
 * and when to render the pagination buttons.
 */
export const buildRows = (
  nodes: JsonNode[],
  rootType: CollectionType,
  expanded: ReadonlySet<string>,
  revealed: ReadonlyMap<string, number>,
  revealedBySearch: ReadonlyMap<string, number>
): RenderRow[] =>
  flattenRows(nodes, ROOT_ID, rootType, expanded, revealed, revealedBySearch, 0, null, []);

const flattenRows = (
  nodes: JsonNode[],
  listId: string,
  listType: CollectionType,
  expanded: ReadonlySet<string>,
  revealed: ReadonlyMap<string, number>,
  revealedBySearch: ReadonlyMap<string, number>,
  depth: number,
  parentId: string | null,
  out: RenderRow[]
): RenderRow[] => {
  // Show whichever is larger: the user's revealed count (default INITIAL_CHILDREN) or the count the
  // active search needs to surface a match deeper than the pager budget.
  const userShown = Math.min(revealed.get(listId) ?? INITIAL_CHILDREN, nodes.length);
  const searchShown = Math.min(revealedBySearch.get(listId) ?? 0, nodes.length);
  const shown = Math.max(userShown, searchShown);

  for (let index = 0; index < shown; index++) {
    const node = nodes[index];
    // The last shown item still gets a comma when more are hidden.
    const trailingComma = index < nodes.length - 1;
    const hasChildren = node.kind === 'collection' && node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.id);
    out.push({
      kind: 'node',
      node,
      depth,
      hasChildren,
      isExpanded,
      trailingComma,
      parentId,
      setSize: nodes.length,
      posInSet: index + 1,
    });
    if (isExpanded && node.kind === 'collection') {
      flattenRows(
        node.children,
        node.id,
        node.collectionType,
        expanded,
        revealed,
        revealedBySearch,
        depth + 1,
        node.id,
        out
      );
      out.push({
        kind: 'closing',
        id: `${node.id}__close`,
        depth,
        collectionType: node.collectionType,
        trailingComma,
      });
    }
  }

  const hidden = nodes.length - shown;
  const canShowFewer = userShown > INITIAL_CHILDREN;
  if (hidden > 0 || canShowFewer) {
    out.push({
      kind: 'pager',
      id: `${listId}__pager`,
      depth,
      parentId,
      collectionId: listId,
      collectionType: listType,
      hiddenCount: hidden,
      totalCount: nodes.length,
      canShowFewer,
    });
  }
  return out;
};

export const rowKey = (row: RenderRow) => (row.kind === 'node' ? row.node.id : row.id);

export const isFocusable = (row: RenderRow): row is NodeRow | PagerRow => row.kind !== 'closing';

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getPrimitiveType = (value: unknown): PrimitiveType => {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'null';
};

const normalizePrimitive = (value: unknown): JsonPrimitive => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
};

// Length-prefixed (Pascal-string style) encoding: framing each segment with its length keeps the id
// collision-proof even when a key contains the separators, so distinct paths never share an id.
export const getNodeId = (path: readonly string[]): string =>
  path.reduce((id, key) => `${id}/${key.length}:${key}`, 'json-viewer');

/**
 * Collects the ids of collections to expand, breadth-first, until expanding one more would render
 * more than `budget` rows. Empty collections can't be expanded. Breadth-first so the first levels
 * expand first; deeper nodes stay collapsed and can be expanded on demand.
 */
export const collectExpandableIds = (
  roots: JsonNode[],
  budget: number = MAX_RENDERED_NODES
): string[] => {
  const ids: string[] = [];
  let remaining = budget;
  const queue: CollectionNode[] = [];
  const enqueue = (nodes: JsonNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'collection' && node.children.length > 0) {
        queue.push(node);
      }
    }
  };

  enqueue(roots);
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    // Expanding a collection reveals up to INITIAL_CHILDREN child rows (the pager caps the rest).
    const cost = Math.min(node.children.length, INITIAL_CHILDREN);
    if (cost > remaining) {
      // Budget spent for this branch; keep scanning — a smaller sibling may still fit.
      continue;
    }
    ids.push(node.id);
    remaining -= cost;
    enqueue(node.children);
  }

  return ids;
};

export interface DefaultExpansionSeed {
  expanded: Set<string>;
  revealed: Map<string, number>;
}

/**
 * Builds the initial expand/reveal state: opens collections and lifts pagers, breadth-first,
 * until about `rowBudget` rows are rendered. Children are revealed in
 * INITIAL_CHILDREN-sized chunks that interleave across arrays/objects using a round-robin approach.
 *
 * This prevents a gigant array/object to eat all the budget leaving other collections hidden,
 * instead the budget is splitted between the collections.
 *
 */
export const collectDefaultExpansionSeed = (
  roots: JsonNode[],
  rowBudget: number
): DefaultExpansionSeed => {
  const expanded = new Set<string>();
  const revealed = new Map<string, number>();
  let rows = 0;

  const queue: Array<{
    listId: string;
    collectionId?: string;
    nodes: JsonNode[];
    offset: number;
  }> = [{ listId: ROOT_ID, nodes: roots, offset: 0 }];

  for (let head = 0; head < queue.length; head++) {
    if (rows >= rowBudget) break;
    const { listId, collectionId, nodes, offset } = queue[head];
    if (collectionId) {
      expanded.add(collectionId); // reaching a collection with budget left is what opens it
    }
    const end = Math.min(offset + INITIAL_CHILDREN, nodes.length);
    let shown = offset;
    for (let i = offset; i < end && rows < rowBudget; i++) {
      const node = nodes[i];
      shown = i + 1;
      rows += 1; // every shown child renders one row
      if (node.kind === 'collection' && node.children.length > 0) {
        queue.push({ listId: node.id, collectionId: node.id, nodes: node.children, offset: 0 });
      }
    }
    // Lift this list's pager only when we revealed past the default window.
    if (shown > INITIAL_CHILDREN) {
      revealed.set(listId, shown);
    }
    // More hidden children remain — revisit this list later (round-robin) if budget allows.
    if (end < nodes.length && rows < rowBudget) {
      queue.push({ listId, collectionId, nodes, offset: end });
    }
  }

  return { expanded, revealed };
};

/** Serialize a subtree back to JSON (used by the copy-value / copy-subtree features) */
export const nodeToJsonString = (node: JsonNode): string =>
  JSON.stringify(nodeToJsonValue(node), null, 2);

export const nodeToJsonValue = (node: JsonNode): JsonValue => {
  if (node.kind === 'leaf') {
    return node.value;
  }
  if (node.collectionType === 'array') {
    return node.children.map(nodeToJsonValue);
  }
  const object: Record<string, JsonValue> = {};
  for (const child of node.children) {
    object[child.key] = nodeToJsonValue(child);
  }
  return object;
};

/** Serialize the whole document (the root node list) to JSON, matching how the tree renders it. */
export const rootToJsonString = (nodes: JsonNode[], rootType: CollectionType): string => {
  return nodeToJsonString({
    id: ROOT_ID,
    key: '',
    isArrayItem: false,
    kind: 'collection',
    collectionType: rootType,
    children: nodes,
  });
};
