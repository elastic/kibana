/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
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

export function DeepStrict<TSchema extends z.ZodType>(schema: TSchema): TSchema {
  // Use Proxy to intercept parse/safeParse methods and add deep strict validation
  const proto = Object.getPrototypeOf(schema);
  const proxy = new Proxy(schema, {
    get(target, accessor, receiver) {
      // Intercept parse and safeParse to add excess key checking
      if (accessor === 'parse' || accessor === 'safeParse') {
        return function (data: unknown, ...args: any[]) {
          // Call the original parse method on the target (not the proxy)
          const result = proto[accessor].call(target, data, ...args);

          // For safeParse, check if parsing failed
          if (accessor === 'safeParse' && !result.success) {
            return result;
          }

          // Get the parsed data (result for parse, result.data for safeParse)
          const parsedData = accessor === 'safeParse' ? result.data : result;

          // Compare input keys vs output keys
          const allInputKeys = Array.from(getFlattenedKeys(data));
          const allOutputKeys = Array.from(getFlattenedKeys(parsedData));
          const excessKeys = difference(allInputKeys, allOutputKeys);

          if (excessKeys.length) {
            const error = new z.ZodError([
              {
                code: 'unrecognized_keys',
                keys: excessKeys,
                message: `Excess keys are not allowed`,
                path: [],
              },
            ]);

            if (accessor === 'safeParse') {
              return { success: false, error };
            }
            throw error;
          }

          return result;
        };
      }

      // For other properties/methods, bind them to the proxy receiver
      const original = Reflect.getOwnPropertyDescriptor(target, accessor)?.value;
      if (typeof original === 'function') {
        return proto[accessor].bind(receiver);
      }

      return Reflect.get(target, accessor, receiver);
    },
  });
  return proxy as TSchema;
}
