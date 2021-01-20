/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { cloneDeepWith } from 'lodash';

// We should add `any` return type to overcome bug in lodash types, customizer
// in lodash 3.* can return `undefined` if cloning is handled by the lodash, but
// type of the customizer function doesn't expect that.
function cloneBuffersCustomizer(val: unknown): any {
  if (Buffer.isBuffer(val)) {
    return Buffer.from(val);
  }
}

export function deepCloneWithBuffers<T>(val: T): T {
  return cloneDeepWith(val, cloneBuffersCustomizer);
}
