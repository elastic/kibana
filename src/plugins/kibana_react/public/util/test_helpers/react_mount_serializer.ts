/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function test(value: any) {
  return value && value.__reactMount__;
}

export function print(value: any, serialize: any) {
  // there is no proper way to correctly indent multiline values
  // so the trick here is to use the Object representation and rewriting the root object name
  return serialize({
    reactNode: value.__reactMount__,
  }).replace('Object', 'MountPoint');
}
