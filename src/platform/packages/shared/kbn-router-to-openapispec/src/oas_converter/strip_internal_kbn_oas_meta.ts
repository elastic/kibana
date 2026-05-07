/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Removes internal bridge keys (`x-oas-*`) copied from Zod `.meta(...)` into JSON Schema.
 * They are only inputs for post-processing and must not appear in published OpenAPI documents.
 */
export function stripInternalKbnOasMetaExtensions(node: unknown): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      stripInternalKbnOasMetaExtensions(item);
    }
    return;
  }

  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string') {
    return;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('x-oas-')) {
      delete obj[key];
    }
  }

  for (const value of Object.values(obj)) {
    stripInternalKbnOasMetaExtensions(value);
  }
}
