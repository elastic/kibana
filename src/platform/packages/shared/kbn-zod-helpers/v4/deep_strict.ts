/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { difference, isArray, isPlainObject } from 'lodash';

function getFlattenedKeys(obj: unknown, parentKey = '', keys: Set<string> = new Set()) {
  if (isPlainObject(obj)) {
    Object.entries(obj as Record<string, any>).forEach(([key, value]) => {
      getFlattenedKeys(value, parentKey ? `${parentKey}.${key}` : key, keys);
    });
  } else if (isArray(obj)) {
    obj.forEach((value) => {
      getFlattenedKeys(value, parentKey, keys);
    });
  }

  keys.add(parentKey);

  return keys;
}

/**
 * Wraps a Zod schema to deeply reject any unrecognized keys in the input.
 *
 * This works by trial-parsing the input with the given schema, then comparing
 * the flattened keys of the raw input against the flattened keys of the parsed
 * output. Any excess keys in the input will cause validation to fail.
 *
 * The actual parsing is done by piping through the original schema, so all
 * schema-level errors are preserved.
 */
export function DeepStrict<TSchema extends z.ZodType>(schema: TSchema) {
  return z.pipe(
    z.unknown().check((ctx) => {
      // Trial-parse to compare input vs output keys
      const result = schema.safeParse(ctx.value);

      // If the schema itself rejects the input, skip the excess key check
      // and let the pipe's second stage produce the proper schema errors.
      if (!result.success) {
        return;
      }

      const allInputKeys = Array.from(getFlattenedKeys(ctx.value));
      const allOutputKeys = Array.from(getFlattenedKeys(result.data as Record<string, any>));

      const excessKeys = difference(allInputKeys, allOutputKeys);

      if (excessKeys.length) {
        ctx.issues.push({
          code: 'unrecognized_keys',
          keys: excessKeys,
          input: ctx.value as Record<string, unknown>,
          message: `Excess keys are not allowed`,
        });
      }
    }),
    schema
  );
}
