/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const makeRegEx: ((glob: string) => RegExp) & import('lodash').MemoizedFunction;
export declare function fieldWildcardMatcher(
  globs?: string[],
  metaFields?: unknown[]
): (val: unknown) => boolean;
export declare function fieldWildcardFilter(
  globs?: string[],
  metaFields?: string[]
): (val: unknown) => boolean;
