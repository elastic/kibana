/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TEMPLATE_VALUE_DEF_NAME } from '@kbn/workflows-yaml';
import type { JsonObject, JsonValue } from './types';

/** Narrow a JSON value to a plain object (excludes `null` and arrays). */
export const isObject = (value: JsonValue | undefined): value is JsonObject =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);

/**
 * Resolve a local JSON pointer (`#/a/b/c`) against `root`, decoding the `~1`/`~0`
 * escapes. Returns `undefined` for non-local refs or when any segment is missing
 * or resolves to a non-object.
 */
export const resolveLocalRef = (root: JsonObject, ref: string): JsonObject | undefined => {
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  const segments = ref.slice(2).split('/');
  let current: JsonValue = root;
  for (const segment of segments) {
    const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isObject(current) || !(decoded in current)) {
      return undefined;
    }
    current = current[decoded];
  }
  return isObject(current) ? current : undefined;
};

/**
 * Resolve the container object and final key of a local JSON pointer, so callers
 * can reassign the referenced node in place (e.g. replace a definition). Returns
 * `undefined` when the pointer is non-local or its parent path is missing.
 */
export const resolveRefContainer = (
  root: JsonObject,
  ref: string
): { container: JsonObject; key: string } | undefined => {
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  const key = segments.pop();
  if (key === undefined) {
    return undefined;
  }
  let container: JsonValue = root;
  for (const segment of segments) {
    if (!isObject(container) || !(segment in container)) {
      return undefined;
    }
    container = container[segment];
  }
  return isObject(container) ? { container, key } : undefined;
};

/**
 * Strip a template-union wrapper (`anyOf: [<concrete>, { $ref: __workflowTemplateValue }]`)
 * added by the `template`/`strict` transform, returning the single concrete
 * branch. Nodes that are not wrappers (e.g. the pristine composed schema) pass
 * through unchanged, so callers work on both composed and transformed documents.
 */
export const unwrapTemplate = (node: JsonValue | undefined): JsonValue | undefined => {
  if (isObject(node) && Array.isArray(node.anyOf)) {
    const isTemplateRef = (candidate: JsonValue): boolean =>
      isObject(candidate) &&
      typeof candidate.$ref === 'string' &&
      candidate.$ref.endsWith(`/${TEMPLATE_VALUE_DEF_NAME}`);
    const concrete = node.anyOf.filter((branch) => !isTemplateRef(branch));
    if (concrete.length === 1 && concrete.length !== node.anyOf.length) {
      return concrete[0];
    }
  }
  return node;
};

/**
 * Resolve the discriminated union backing a top-level array property (`steps` or
 * `triggers`). The property is an array whose `items` is a `$ref` (or inline
 * union); this returns that union node (the resolved definition object, so
 * mutations persist in the document).
 */
export const resolveTopLevelUnion = (
  root: JsonObject,
  propertyName: string
): JsonObject | undefined => {
  const properties = root.properties;
  if (!isObject(properties)) {
    return undefined;
  }
  const propertyNode = unwrapTemplate(properties[propertyName]);
  if (!isObject(propertyNode)) {
    return undefined;
  }
  const items = unwrapTemplate(propertyNode.items) ?? propertyNode;
  if (isObject(items) && typeof items.$ref === 'string') {
    // Fall back to the (unresolved) ref node so an unrecognized shape surfaces as
    // "no discriminators" rather than "could not locate the union".
    return resolveLocalRef(root, items.$ref) ?? items;
  }
  return isObject(items) ? items : undefined;
};
