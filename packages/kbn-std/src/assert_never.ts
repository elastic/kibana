/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Can be used in switch statements to ensure we perform exhaustive checks, see
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
 *
 * @public
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
