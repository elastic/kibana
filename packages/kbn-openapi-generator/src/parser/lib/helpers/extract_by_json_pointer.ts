/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PlainObject } from './plain_object';
import { isPlainObjectType } from './is_plain_object_type';

/**
 * Extract a node from a document using a provided [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901).
 *
 * JSON Pointer is the second part in [JSON Reference](https://datatracker.ietf.org/doc/html/draft-pbryan-zyp-json-ref-03).
 * For example an object `{ $ref: "./some-file.yaml#/components/schemas/MySchema"}` is a reference node.
 * Where `/components/schemas/MySchema` is a JSON pointer. `./some-file.yaml` is a document reference.
 * Yaml shares the same JSON reference standard and basically can be considered just as a different
 * JS Object serialization format. See OpenAPI [Using $ref](https://swagger.io/docs/specification/using-ref/) for more information.
 *
 * @param document a document containing node to resolve by using the pointer
 * @param pointer a JSON Pointer
 * @returns resolved document node (it's always a JS object)
 */
export function extractByJsonPointer(document: unknown, pointer: string): PlainObject {
  if (!pointer.startsWith('/')) {
    throw new Error('$ref pointer must start with a leading slash');
  }

  if (!isPlainObjectType(document)) {
    throw new Error('document must be an object');
  }

  let target = document;

  for (const segment of pointer.slice(1).split('/')) {
    const nextTarget = target[segment];

    if (!isPlainObjectType(nextTarget)) {
      throw new Error(`JSON Pointer "${pointer}" is not found in "${JSON.stringify(document)}"`);
    }

    target = nextTarget;
  }

  return target;
}
