/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ParsedRef {
  path: string;
  pointer: string;
}

/**
 * Parses [JSON Reference](https://datatracker.ietf.org/doc/html/draft-pbryan-zyp-json-ref-03)
 *
 * @param ref JSON Reference
 * @returns file path and JSON pointer
 */
export function parseRef(ref: string): ParsedRef {
  const [filePath, pointer] = ref.split('#');

  if (!pointer) {
    throw new Error(`Unable to parse $ref "${ref}"`);
  }

  return {
    path: filePath,
    pointer,
  };
}
