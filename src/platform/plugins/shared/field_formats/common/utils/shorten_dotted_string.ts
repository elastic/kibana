/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Convert a dot.notated.string into a short
 * version (d.n.string)
 *
 * @return {unknown}
 */
export function shortenDottedString(input: unknown) {
  if (typeof input !== 'string' || input.indexOf('.') === -1) {
    return input;
  }

  const split = input.split('.');
  return split.reduce((acc, part, i) => {
    if (i === split.length - 1) {
      return acc + part;
    }
    // charAt returns '' for empty segments (consecutive/leading dots), preserving them as-is
    return acc + part.charAt(0) + '.';
  }, '');
}
