/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRecursiveSerializer } from './recursive_serializer';

type Replacer = (substring: string, ...args: any[]) => string;

export function createReplaceSerializer(
  toReplace: string | RegExp,
  replaceWith: string | Replacer
) {
  return createRecursiveSerializer(
    typeof toReplace === 'string'
      ? (v: any) => typeof v === 'string' && v.includes(toReplace)
      : (v: any) => typeof v === 'string' && toReplace.test(v),
    typeof replaceWith === 'string'
      ? (v: string) => v.replace(toReplace, replaceWith)
      : (v: string) => v.replace(toReplace, replaceWith)
  );
}
