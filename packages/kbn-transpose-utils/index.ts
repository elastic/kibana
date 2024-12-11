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

export function getTransposeId(value: string, columnId: string) {
  return `${value}${TRANSPOSE_SEPARATOR}${columnId}`;
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
