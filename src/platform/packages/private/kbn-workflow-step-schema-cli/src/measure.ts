/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import type { JsonObject, JsonValue } from './types';

/**
 * Deterministic JSON serialization: object keys are sorted recursively (array
 * order is preserved, since it is semantically meaningful in JSON Schema). This
 * gives stable diffs, caching, and reproducible sha256 across runs.
 */
export const stableStringify = (value: JsonValue, pretty = false): string => {
  const indent = pretty ? 2 : 0;
  return JSON.stringify(sortKeys(value), null, indent);
};

const sortKeys = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const sorted: JsonObject = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
};

export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex');

export interface SizeMetrics {
  sizeBytes: number;
  gzipBytes: number;
  sha256: string;
}

/** Measure a document from its canonical (minified, key-sorted) serialization. */
export const measureDocument = (doc: JsonObject): SizeMetrics => {
  const canonical = stableStringify(doc, false);
  const buffer = Buffer.from(canonical, 'utf8');
  return {
    sizeBytes: buffer.byteLength,
    gzipBytes: gzipSync(buffer).byteLength,
    sha256: sha256Hex(canonical),
  };
};

/** Resolve the definitions map key used by a schema, if any. */
export const getDefinitionsKey = (doc: JsonObject): string | undefined => {
  if (doc.definitions !== undefined) {
    return 'definitions';
  }
  if (doc.$defs !== undefined) {
    return '$defs';
  }
  return undefined;
};

export const countDefinitions = (doc: JsonObject): number => {
  const key = getDefinitionsKey(doc);
  if (!key) {
    return 0;
  }
  const defs = doc[key];
  return defs !== null && typeof defs === 'object' && !Array.isArray(defs)
    ? Object.keys(defs).length
    : 0;
};

/**
 * Best-effort count of step union branches, used only as an informational
 * metric. Locates `properties.steps.items`, resolves a single `$ref` into the
 * definitions map, and counts its `anyOf`/`oneOf` entries.
 */
export const countStepUnionBranches = (doc: JsonObject): number => {
  // The `steps` array may have been wrapped as `anyOf: [<array>, <template strings>]`
  // by the template transform; unwrap to the concrete typed branch (index 0).
  const steps = unwrapTemplateWrapper(asObject(asObject(doc.properties)?.steps));
  let items = asObject(steps?.items);
  if (!items) {
    return 0;
  }

  const ref = items.$ref;
  if (typeof ref === 'string') {
    const resolved = resolveLocalRef(doc, ref);
    if (resolved) {
      items = resolved;
    }
  }

  // Union branches may be nested inside an anyOf wrapper added by the transform.
  const union = firstUnionArray(items);
  return union ? union.length : 0;
};

/**
 * If a node is a template-transform wrapper (`anyOf: [<concrete>, ...template
 * strings]`), return the concrete branch; otherwise return the node unchanged.
 */
const unwrapTemplateWrapper = (node: JsonObject | undefined): JsonObject | undefined => {
  if (node && Array.isArray(node.anyOf) && node.items === undefined) {
    const first = asObject(node.anyOf[0]);
    if (first && first.items !== undefined) {
      return first;
    }
  }
  return node;
};

const firstUnionArray = (node: JsonObject | undefined): JsonValue[] | undefined => {
  if (!node) {
    return undefined;
  }
  if (Array.isArray(node.anyOf)) {
    return node.anyOf;
  }
  if (Array.isArray(node.oneOf)) {
    return node.oneOf;
  }
  return undefined;
};

const resolveLocalRef = (doc: JsonObject, ref: string): JsonObject | undefined => {
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  const segments = ref.slice(2).split('/');
  let current: JsonValue = doc;
  for (const segment of segments) {
    const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    const next = asObject(current);
    if (!next || !(decoded in next)) {
      return undefined;
    }
    current = next[decoded];
  }
  return asObject(current);
};

const asObject = (value: JsonValue | undefined): JsonObject | undefined =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value
    : undefined;
