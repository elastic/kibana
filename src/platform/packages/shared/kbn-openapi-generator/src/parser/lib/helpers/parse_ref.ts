/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface ParsedRef {
  uri: string;
  pointer: string;
  schemaName: string;
}

/**
 * Parses an OpenAPI reference a.k.a JSON reference
 * See https://datatracker.ietf.org/doc/html/draft-pbryan-zyp-json-ref-03
 *
 * JSON reference consists of an optional uri and required JSON pointer
 * looking like `uri#pointer`. While RFC implies URI usage mostly relative
 * paths are used.
 *
 * An example looks like
 *
 * ```
 * ../path/to/my/file.schema.yaml#/components/schemas/MySchema
 * ```
 *
 *  This function returns `uri`, JSON `pointer` and
 * `schemaName` which is the last part of the JSON pointer. In the example
 * above `schemaName` is `MySchema`.
 */
export function parseRef(ref: string): ParsedRef {
  if (!ref.includes('#')) {
    throw new Error(`Reference parse error: provided ref is not valid "${ref}"`);
  }

  const [uri, pointer] = ref.split('#');
  const schemaName = pointer.split('/').at(-1)!;

  return {
    uri,
    pointer,
    schemaName,
  };
}
