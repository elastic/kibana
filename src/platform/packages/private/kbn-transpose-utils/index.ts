/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Used to delimitate felids of a transposed column id
 */
export const TRANSPOSE_SEPARATOR = '---';

/**
 * Visual deliminator between felids of a transposed column id
 *
 * Meant to align with the `MULTI_FIELD_KEY_SEPARATOR` from the data plugin
 */
export const TRANSPOSE_VISUAL_SEPARATOR = '›';

/**
 * Create a transposed column ID with optional dimension prefix
 * For backward compatibility, dimension defaults to 'columns'
 */
export function getTransposeId(value: string, columnId: string, dimension?: 'rows' | 'columns') {
  // For backward compatibility, don't add dimension prefix if not specified or if it's 'columns'
  if (!dimension || dimension === 'columns') {
    return `${value}${TRANSPOSE_SEPARATOR}${columnId}`;
  }
  return `${dimension}:${value}${TRANSPOSE_SEPARATOR}${columnId}`;
}

/**
 * Parse a transpose ID to extract dimension, value, and column ID
 */
export function parseTransposeId(id: string): {
  dimension: 'rows' | 'columns';
  values: string[];
  columnId: string;
} {
  // Check if ID has dimension prefix
  const dimensionMatch = id.match(/^(rows|columns):/);
  const dimension = (dimensionMatch?.[1] as 'rows' | 'columns') || 'columns';

  // Remove dimension prefix if present
  const idWithoutDimension = dimensionMatch ? id.slice(dimensionMatch[0].length) : id;

  // Split by separator
  const parts = idWithoutDimension.split(TRANSPOSE_SEPARATOR);
  const columnId = parts.pop() || '';
  const values = parts;

  return { dimension, values, columnId };
}

export function isTransposeId(id: string): boolean {
  return id.split(TRANSPOSE_SEPARATOR).length > 1;
}

export function getOriginalId(id: string) {
  if (id.includes(TRANSPOSE_SEPARATOR)) {
    const idParts = id.split(TRANSPOSE_SEPARATOR);
    return idParts[idParts.length - 1];
  }
  return id;
}
