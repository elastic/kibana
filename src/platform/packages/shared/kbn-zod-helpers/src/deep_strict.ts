/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodIssueCode } from '@kbn/zod';
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

function parseStrict<TSchema extends z.Schema>(
  source: z.Schema,
  input: z.ParseInput
): z.ParseReturnType<z.output<TSchema>> {
  const next = source._parse(input);
  if (!z.isValid(next)) {
    return next;
  }

  const allInputKeys = Array.from(getFlattenedKeys(input.data));
  const allOutputKeys = Array.from(getFlattenedKeys(next.value as Record<string, any>));

  const excessKeys = difference(allInputKeys, allOutputKeys);

  if (excessKeys.length) {
    input.parent.common.issues.push({
      code: ZodIssueCode.unrecognized_keys,
      keys: excessKeys,
      message: `Excess keys are not allowed`,
      path: input.path,
    });
    return z.INVALID;
  }
  return next;
}

export function DeepStrict<TSchema extends z.Schema>(schema: TSchema) {
  return schema; // TODO: Need to handle for zod v4

  // We really only want to override _parse, but:
  // - it should not have the same identity as the wrapped schema
  // - all methods should be bound to the original schema
  // if we use { ..., _parse: overrideParse } it won't work because Zod
  // explicitly binds all properties in the constructor.
  // so what we do is:
  // - get the prototype of the schema
  // - wrap the schema in a proxy
  // - if there's a function being accessed, return one that is bound
  // to the proxy receiver
  // - if _parse is being accessed, override with our parseStrict fn
  const proto = Object.getPrototypeOf(schema);
  const proxy = new Proxy(schema, {
    get(target, accessor, receiver) {
      if (accessor === '_parse') {
        return parseStrict.bind(null, schema);
      }

      const original = Reflect.getOwnPropertyDescriptor(target, accessor)?.value;

      if (typeof original === 'function') {
        return proto[accessor].bind(receiver);
      }

      return Reflect.get(target, accessor, receiver);
    },
  });
  return proxy;
}
