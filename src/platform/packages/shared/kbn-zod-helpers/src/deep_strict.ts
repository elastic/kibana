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

export function DeepStrict<TSchema extends z.ZodType>(
  schema: TSchema
): z.ZodType<z.output<TSchema>> {
  let rawInput: unknown;
  return z
    .unknown()
    .transform((value) => {
      rawInput = value;
      return value;
    })
    .pipe(schema)
    .check((payload) => {
      const allInputKeys = Array.from(getFlattenedKeys(rawInput));
      const allOutputKeys = Array.from(getFlattenedKeys(payload.value));

      const excessKeys = difference(allInputKeys, allOutputKeys);

      if (excessKeys.length) {
        payload.issues.push({
          code: 'unrecognized_keys',
          keys: excessKeys,
          message: 'Excess keys are not allowed',
          path: [],
          input: rawInput as Record<string, unknown>,
        });
      }
    });
}
