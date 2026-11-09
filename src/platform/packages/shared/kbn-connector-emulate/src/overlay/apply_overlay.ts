/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { OpenApiDocument } from '../openapi';
import { InvalidOverlayError } from './invalid_overlay_error';
import type { JsonPathNode } from './json_path';
import { queryJsonPath } from './json_path';

/** One correction: a JSONPath `target` and how to change what it selects. */
export interface OverlayAction {
  readonly target: string;
  /** Why the vendor spec is corrected; overlays for connectors should also cite evidence. */
  readonly description?: string;
  readonly update?: unknown;
  /** A JSONPath selecting one node of the document to merge into the targets. */
  readonly copy?: string;
  readonly remove?: boolean;
  readonly [extension: `x-${string}`]: unknown;
}

/** An OpenAPI Overlay (1.0 or 1.1) document. */
export interface OverlayDocument {
  readonly overlay: string;
  readonly info: { readonly title: string; readonly version: string };
  readonly extends?: string;
  readonly actions: readonly OverlayAction[];
}

/**
 * An action that no longer corrects anything: its target matches nothing, or applying it leaves
 * the document unchanged. Usually the vendor has fixed the spec and the action can be removed.
 */
export interface OverlayFinding {
  readonly index: number;
  readonly action: OverlayAction;
  readonly problem: 'no-match' | 'no-change';
}

export interface OverlayResult {
  readonly document: OpenApiDocument;
  readonly findings: readonly OverlayFinding[];
}

type Container = Record<string, unknown> | unknown[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isContainer = (value: unknown): value is Container =>
  typeof value === 'object' && value !== null;

// Items already present are not appended again, so a correction the vendor later adopts
// doesn't end up declared twice.
const append = (target: unknown[], items: readonly unknown[]): boolean => {
  let changed = false;
  for (const item of items) {
    if (!target.some((existing) => isEqual(existing, item))) {
      target.push(structuredClone(item));
      changed = true;
    }
  }
  return changed;
};

// Overlay 1.1 merge: objects merge recursively, arrays concatenate, anything else replaces.
const merge = (target: Record<string, unknown>, source: Record<string, unknown>): boolean => {
  let changed = false;
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isObject(current) && isObject(value)) {
      changed = merge(current, value) || changed;
    } else if (Array.isArray(current) && Array.isArray(value)) {
      changed = append(current, value) || changed;
    } else if (!Object.hasOwn(target, key) || !isEqual(current, value)) {
      target[key] = structuredClone(value);
      changed = true;
    }
  }
  return changed;
};

const updateNode = ({ value, parent, key }: JsonPathNode, source: unknown, at: string): boolean => {
  if (isObject(value)) {
    if (!isObject(source)) {
      throw new InvalidOverlayError(`${at}: an object target needs an object to merge`);
    }
    return merge(value, source);
  }
  if (Array.isArray(value)) {
    return append(value, Array.isArray(source) ? source : [source]);
  }
  if (isContainer(source) || !parent || key === undefined) {
    throw new InvalidOverlayError(`${at}: a primitive target can only be replaced by a primitive`);
  }
  if (isEqual(value, source)) {
    return false;
  }
  if (Array.isArray(parent)) {
    parent[Number(key)] = source;
  } else {
    parent[key] = source;
  }
  return true;
};

const removeNodes = (nodes: readonly JsonPathNode[], at: string): void => {
  // Array items are removed from the highest index down, so earlier removals don't shift later ones.
  const position = ({ key }: JsonPathNode) => (typeof key === 'number' ? key : -1);
  const ordered = [...nodes].sort((a, b) => position(b) - position(a));
  for (const { parent, key } of ordered) {
    if (!parent || key === undefined) {
      throw new InvalidOverlayError(`${at}: the document root cannot be removed`);
    }
    if (Array.isArray(parent)) {
      parent.splice(Number(key), 1);
    } else {
      delete parent[key];
    }
  }
};

const assertValidOverlay = (overlay: OverlayDocument): void => {
  if (typeof overlay.overlay !== 'string' || !/^1\.[01]\./.test(overlay.overlay)) {
    throw new InvalidOverlayError(`Overlay version ${overlay.overlay} is not supported (1.0, 1.1)`);
  }
  if (!Array.isArray(overlay.actions) || overlay.actions.length === 0) {
    throw new InvalidOverlayError('An overlay needs at least one action');
  }
  overlay.actions.forEach((action, index) => {
    const at = `Overlay action ${index}`;
    if (typeof action.target !== 'string') {
      throw new InvalidOverlayError(`${at}: target is not a JSONPath string`);
    }
    if (action.remove !== undefined && typeof action.remove !== 'boolean') {
      throw new InvalidOverlayError(`${at}: remove is not a boolean`);
    }
    if (action.copy !== undefined && typeof action.copy !== 'string') {
      throw new InvalidOverlayError(`${at}: copy is not a JSONPath string`);
    }
    if (!action.remove && action.update === undefined && action.copy === undefined) {
      throw new InvalidOverlayError(`${at}: needs update, copy or remove`);
    }
  });
};

const query = (document: OpenApiDocument, path: string, at: string): JsonPathNode[] => {
  try {
    return queryJsonPath(document, path);
  } catch (error) {
    throw new InvalidOverlayError(`${at}: ${error instanceof Error ? error.message : error}`);
  }
};

const readCopySource = (document: OpenApiDocument, copy: string, at: string): unknown => {
  const sources = query(document, copy, at);
  if (sources.length !== 1) {
    throw new InvalidOverlayError(`${at}: copy selects ${sources.length} nodes instead of one`);
  }
  return structuredClone(sources[0].value);
};

/**
 * Applies an OpenAPI Overlay to a copy of a document, action by action, and reports actions that
 * no longer change anything. Throws an {@link InvalidOverlayError} for malformed overlays.
 */
export const applyOverlay = (
  document: OpenApiDocument,
  overlay: OverlayDocument
): OverlayResult => {
  assertValidOverlay(overlay);
  const result = structuredClone(document);
  const findings: OverlayFinding[] = [];
  overlay.actions.forEach((action, index) => {
    const at = `Overlay action ${index}`;
    const nodes = query(result, action.target, at);
    if (nodes.length === 0) {
      findings.push({ index, action, problem: 'no-match' });
      return;
    }
    if (action.remove) {
      removeNodes(nodes, at);
      return;
    }
    const source =
      action.update !== undefined ? action.update : readCopySource(result, action.copy ?? '', at);
    const changed = nodes.map((node) => updateNode(node, source, at)).some(Boolean);
    if (!changed) {
      findings.push({ index, action, problem: 'no-change' });
    }
  });
  return { document: result, findings };
};
