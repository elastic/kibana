/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function createRecursiveSerializer(test: (v: any) => boolean, print: (v: any) => string) {
  return {
    test: (v: any) => test(v),
    serialize: (v: any, ...rest: any[]) => {
      const replacement = print(v);
      const printer = rest.pop()!;
      return printer(replacement, ...rest);
    },
  };
}
