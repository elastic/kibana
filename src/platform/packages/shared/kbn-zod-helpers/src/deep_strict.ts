/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type z, ZodError } from '@kbn/zod';
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

function checkExcessKeys(input: unknown, output: unknown): void {
  const allInputKeys = Array.from(getFlattenedKeys(input));
  const allOutputKeys = Array.from(getFlattenedKeys(output));

  const excessKeys = difference(allInputKeys, allOutputKeys);

  if (excessKeys.length) {
    throw new ZodError([
      {
        code: 'unrecognized_keys',
        keys: excessKeys,
        message: 'Excess keys are not allowed',
        path: [],
      },
    ]);
  }
}

export function DeepStrict<TSchema extends z.ZodType>(schema: TSchema): TSchema {
  // Wrap the schema in a Proxy that intercepts `parse` and `safeParse` to check
  // for excess keys by comparing the raw input to the parsed output.
  // z.object() strips unknown keys by default, so any keys present in the input
  // but absent from the output are excess.
  return new Proxy(schema, {
    get(target, accessor, receiver) {
      if (accessor === 'parse') {
        return (data: unknown, params?: unknown) => {
          const result = target.parse(data, params as any);
          checkExcessKeys(data, result);
          return result;
        };
      }

      if (accessor === 'safeParse') {
        return (data: unknown, params?: unknown) => {
          const result = target.safeParse(data, params as any);
          if (!result.success) {
            return result;
          }
          try {
            checkExcessKeys(data, result.data);
            return result;
          } catch (err) {
            return { success: false as const, error: err as ZodError };
          }
        };
      }

      return Reflect.get(target, accessor, receiver);
    },
  });
}
