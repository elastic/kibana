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

/**
 * Turns a json document into a Nodes tree. Each node contains all the
 * metadata needed to perform operations in an easy way.
 */
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
    path,
  };
};

// ---- Flatten visible rows, decides what to show and what not ----

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
  revealed: ReadonlyMap<string, number>
): RenderRow[] => flattenRows(nodes, ROOT_ID, rootType, expanded, revealed, 0, null, []);

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
  // Display the initial children count or the provided revealed count, whichever is smaller.
  const shown = Math.min(revealed.get(listId) ?? INITIAL_CHILDREN, nodes.length);

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

const getNodeId = (path: string[]) => `json-viewer-${path.join('__')}`;

/**
 * Returns a list of Node ids that can be expanded. Empty coollections can't be expanded.
 */
export const collectExpandableIds = (nodes: JsonNode[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind !== 'collection') return [];
    const childIds = collectExpandableIds(node.children);
    return node.children.length > 0 ? [node.id, ...childIds] : childIds;
  });

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

/**
 * Collects the ids of every collection whose subtree contains the term.
 **/
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
