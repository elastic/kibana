/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalRegistry } from 'zod/v4';
const reg = globalRegistry as any;
reg._map = new WeakMap();
reg.clear = function () {
  reg._map = new WeakMap();
  reg._idmap = new Map();
  return this;
};

export * from 'zod/v4';
export { isZod } from './util';
