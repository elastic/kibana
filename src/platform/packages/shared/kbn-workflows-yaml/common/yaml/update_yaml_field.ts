/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';

/**
 * Updates a field in YAML while preserving comments, formatting, and blank lines.
 * This is useful when updating workflow metadata (like enabled, name, description, tags)
 * without losing user's formatting and comments.
 *
 * @param yamlString - The original YAML string
 * @param fieldPath - The dot-notated path to the field to update (e.g., 'enabled', 'name', 'parent.child')
 * @param value - The new value for the field
 * @returns The updated YAML string with formatting preserved
 */
export function updateYamlField(yamlString: string, fieldPath: string, value: unknown): string {
  try {
    const doc = parseDocument(yamlString, { keepSourceTokens: true });

    // Convert dot-notated string to array (e.g., 'parent.child' -> ['parent', 'child'])
    const pathArray = fieldPath.split('.');

    // Update the field in the document
    // If the field doesn't exist, it will be added
    doc.setIn(pathArray, value);

    // Convert back to string, preserving formatting
    return doc.toString();
  } catch (error) {
    // If parsing fails, return original YAML
    // This should not happen in normal operation, but provides a fallback
    return yamlString;
  }
}
