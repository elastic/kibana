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
  } else {
    keys.add(parentKey);
  }
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

  const allInputKeys = Array.from(getFlattenedKeys(input.data).values());
  const allOutputKeys = Array.from(getFlattenedKeys(next.value as Record<string, any>).values());

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
  return new Proxy(schema, {
    apply: (target, thisArg, args) => {
      return parseStrict(schema, args[0]);
    },
  });
}
