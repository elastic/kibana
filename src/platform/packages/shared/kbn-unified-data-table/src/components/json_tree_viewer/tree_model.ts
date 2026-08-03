/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The JSON tree's pure data model: it turns a raw document into a node tree (`buildNodes`) and
 * flattens the currently-visible slice of that tree into an ordered list of render rows
 * (`buildRows`). Nothing here touches React state, styling, or the DOM, so it can be reasoned
 * about — and unit-tested — in isolation from the view.
 */

import React from 'react';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = Record<string, unknown> | unknown[] | JsonPrimitive | undefined;

// Each collection (root + every expanded node) renders at most this many children before a
// "Show N more" row appears; revealing bumps the collection's budget by this increment.
export const INITIAL_CHILDREN = 10;
export const CHILDREN_INCREMENT = 10;

// Stable id for the (container-less) root list, so it can carry its own reveal budget.
export const ROOT_ID = 'json-syntax-$root';

export const OPEN_BRACKET = { object: '{', array: '[' } as const;
export const CLOSE_BRACKET = { object: '}', array: ']' } as const;

// ---- Data model (a plain tree; a leaf may carry a pre-rendered node, e.g. a highlighted value) ----

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
  // A search-highlighted value arrives already rendered (matched terms marked); render it verbatim.
  rendered?: React.ReactNode;
}

export type JsonNode = CollectionNode | LeafNode;

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

const getNodeId = (path: string[]) => `json-syntax-${path.join('__')}`;

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
  // A highlighted value is a React element — a leaf that renders itself, not a collection to
  // recurse into (React elements are objects, so this must precede the object check below).
  if (React.isValidElement(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'leaf',
      primitiveType: 'string',
      value: null,
      rendered: value,
    };
  }

  if (Array.isArray(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'collection',
      collectionType: 'array',
      children: value.map((child, index) =>
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
  };
};

export const buildNodes = (json: JsonValue): JsonNode[] => {
  if (Array.isArray(json)) {
    return json.map((value, index) =>
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

// Ids of the collections that can actually be toggled (empty `{}` / `[]` render inline and
// are not expandable). Drives the Expand/Collapse-all control and `isAllExpanded`.
export const collectExpandableIds = (nodes: JsonNode[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind !== 'collection') return [];
    const childIds = collectExpandableIds(node.children);
    return node.children.length > 0 ? [node.id, ...childIds] : childIds;
  });

// ---- Serialize a subtree back to JSON (drives the copy-value / copy-subtree affordances) ----

// A search-highlighted leaf keeps its raw value only in its rendered React node (matched terms
// wrapped in `<mark>`), so recover the text by walking the node and concatenating its strings.
const reactNodeToText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return reactNodeToText(node.props.children);
  }
  return '';
};

// Reconstruct the plain JSON value a node stands for, so a leaf or a whole collection can be
// copied. Mirrors the shape the tree was built from (array items positional, object fields keyed).
export const nodeToJsonValue = (node: JsonNode): JsonValue => {
  if (node.kind === 'leaf') {
    return node.rendered != null ? reactNodeToText(node.rendered) : node.value;
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

// Pretty-printed JSON for the copy-subtree affordance.
export const nodeToJsonString = (node: JsonNode): string =>
  JSON.stringify(nodeToJsonValue(node), null, 2);

// The root's bracket pair and list type, derived once. `brackets` is null for a primitive
// document (rendered as a single bare value, with no enclosing braces).
export interface RootLayout {
  type: CollectionType;
  brackets: { open: string; close: string } | null;
}

export const getRootLayout = (json: JsonValue): RootLayout => {
  if (Array.isArray(json)) {
    return { type: 'array', brackets: { open: OPEN_BRACKET.array, close: CLOSE_BRACKET.array } };
  }
  if (isJsonObject(json)) {
    return { type: 'object', brackets: { open: OPEN_BRACKET.object, close: CLOSE_BRACKET.object } };
  }
  return { type: 'object', brackets: null };
};

// ---- Flatten visible rows (drives rendering order and keyboard navigation) ----
//
// An expanded collection also emits a synthetic `closing` row after its children, so the tree
// reads like formatted JSON. Closing rows are presentational (`aria-hidden`, no role, not
// focusable) and are excluded from keyboard navigation.
//
// Every collection is capped at its reveal budget; when a list is truncated a `more` row is
// emitted at the children's depth (before the closing bracket). `more` rows are real,
// focusable treeitems so they stay in the roving-tabindex order.

export interface NodeRow {
  kind: 'node';
  node: JsonNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  // Whether a sibling follows this node, i.e. it needs a trailing comma.
  trailingComma: boolean;
  parentId: string | null;
  setSize: number;
  posInSet: number;
}

export interface ClosingRow {
  kind: 'closing';
  id: string;
  depth: number;
  collectionType: CollectionType;
  trailingComma: boolean;
}

// A pager row carries a collection's "Show N more" / "Show fewer" affordances on one focusable
// treeitem: `hiddenCount > 0` enables "Show N more" (the row's primary action) and `canShowFewer`
// enables "Show fewer" (a nested control on the same line). At least one of the two always holds.
export interface PagerRow {
  kind: 'pager';
  id: string;
  depth: number;
  parentId: string | null;
  collectionId: string;
  collectionType: CollectionType;
  hiddenCount: number;
  canShowFewer: boolean;
}

export type RenderRow = NodeRow | ClosingRow | PagerRow;

export const rowKey = (row: RenderRow) => (row.kind === 'node' ? row.node.id : row.id);

// Closing brackets are presentational; nodes and pager rows are the focusable treeitems.
export const isFocusable = (row: RenderRow): row is NodeRow | PagerRow => row.kind !== 'closing';

const flattenRows = (
  nodes: JsonNode[],
  listId: string,
  listType: CollectionType,
  expanded: ReadonlySet<string>,
  revealed: ReadonlyMap<string, number>,
  depth: number,
  parentId: string | null,
  out: RenderRow[]
): RenderRow[] => {
  const shown = Math.min(revealed.get(listId) ?? INITIAL_CHILDREN, nodes.length);
  for (let index = 0; index < shown; index++) {
    const node = nodes[index];
    // Full-length comparison: the last *shown* item still gets a comma when more are hidden.
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
  // One pager row per list carries both affordances so they share a line: "Show N more" while
  // items remain hidden, and "Show fewer" once the list was revealed past its initial cap.
  const hidden = nodes.length - shown;
  const canShowFewer = shown > INITIAL_CHILDREN;
  if (hidden > 0 || canShowFewer) {
    out.push({
      kind: 'pager',
      id: `${listId}__pager`,
      depth,
      parentId,
      collectionId: listId,
      collectionType: listType,
      hiddenCount: hidden,
      canShowFewer,
    });
  }
  return out;
};

// Flatten the visible slice of the tree into ordered render rows, starting at the root list.
export const buildRows = (
  nodes: JsonNode[],
  rootType: CollectionType,
  expanded: ReadonlySet<string>,
  revealed: ReadonlyMap<string, number>
): RenderRow[] => flattenRows(nodes, ROOT_ID, rootType, expanded, revealed, 0, null, []);
