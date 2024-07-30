/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { dump } from 'js-yaml';
import { isPlainObjectType } from './is_plain_object_type';

/**
 * Extract a value from a document using provided [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901).
 *
 * The final value type is not validated so it's responsibility of the outer code.
 */
export function extractByJsonPointer(document: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) {
    throw new Error('JSON pointer must start with a leading slash');
  }

  if (!isPlainObjectType(document)) {
    throw new Error('document must be an object');
  }

  const path: string[] = [''];
  let target: unknown = document;

  for (const segment of pointer.slice(1).split('/')) {
    if (!isPlainObjectType(target)) {
      throw new Error(
        `JSON Pointer ${chalk.bold(pointer)} resolution failure. Expected ${chalk.magenta(
          path.join('/')
        )} to be a plain object but it has type "${typeof target}" in \n\n${dump(document)}`
      );
    }

    path.push(segment);
    target = target[segment];
  }

  return target;
}

/**
 * Extract a node from a document using provided [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901).
 *
 * JSON Pointer is the second part in [JSON Reference](https://datatracker.ietf.org/doc/html/draft-pbryan-zyp-json-ref-03).
 * For example an object `{ $ref: "./some-file.yaml#/components/schemas/MySchema"}` is a reference node.
 * Where `/components/schemas/MySchema` is a JSON pointer. `./some-file.yaml` is a document reference.
 * Yaml shares the same JSON reference standard and basically can be considered just as a different
 * JS Object serialization format. See OpenAPI [Using $ref](https://swagger.io/docs/specification/using-ref/) for more information.
 *
 * @param document a document containing node to resolve by using the pointer
 * @param pointer a JSON Pointer
 * @returns resolved document node
 */
export function extractObjectByJsonPointer(
  document: unknown,
  pointer: string
): Record<string, unknown> {
  const maybeObject = extractByJsonPointer(document, pointer);

  if (!isPlainObjectType(maybeObject)) {
    throw new Error(
      `JSON Pointer resolution failure. Expected ${chalk.magenta(
        pointer
      )} to be a plain object in \n\n${dump(document)}`
    );
  }

  return maybeObject;
}
