/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, isScalar, stringify } from 'yaml';

/**
 * Updates a field in YAML while preserving comments, formatting, and blank lines.
 *
 * When the target field already exists and holds a scalar value, the new value
 * is spliced directly into the original source string at the scalar's byte
 * range. This keeps the rest of the document byte-identical (indentation,
 * quoting of unrelated scalars, blank lines, comments, block-scalar style and
 * trailing newlines all survive untouched).
 *
 * When the field does not yet exist, or holds a collection (sequence/map), we
 * fall back to re-emitting the document via `doc.toString()`. That path can
 * normalize formatting, but it is only taken for additive updates — the common
 * "toggle enabled" / "rename" paths use the splice fast path.
 *
 * @param yamlString - The original YAML string
 * @param fieldPath - Dot-notated path to the field (e.g. 'enabled', 'metadata.author')
 * @param value - The new value for the field
 * @returns The updated YAML string
 */
export function updateYamlField(yamlString: string, fieldPath: string, value: unknown): string {
  try {
    const doc = parseDocument(yamlString, { keepSourceTokens: true });
    const pathArray = fieldPath.split('.');

    const existingNode = doc.getIn(pathArray, true);

    if (isScalar(existingNode) && Array.isArray(existingNode.range) && isPrimitive(value)) {
      const [start, end] = existingNode.range;
      const serialized = stringify(value, { lineWidth: 0 }).replace(/\n+$/, '');
      return yamlString.slice(0, start) + serialized + yamlString.slice(end);
    }

    doc.setIn(pathArray, value);
    return doc.toString();
  } catch {
    return yamlString;
  }
}

const isPrimitive = (value: unknown): boolean =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';
