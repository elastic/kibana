/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function test(value?: Record<string, unknown>) {
  return value && value.__reactMount__;
}

export function print(
  value: Record<string, unknown>,
  serialize: (args: Record<string, unknown>) => { replace: (s1: string, s2: string) => unknown }
) {
  // there is no proper way to correctly indent multiline values
  // so the trick here is to use the Object representation and rewriting the root object name
  return serialize({
    reactNode: value.__reactMount__,
  }).replace('Object', 'MountPoint');
}
