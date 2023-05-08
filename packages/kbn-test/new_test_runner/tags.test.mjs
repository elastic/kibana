/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { it } from 'node:test';
import assert from 'node:assert/strict';

it('works @sanity', () => {
  assert.equal(1, 1);
});

it('works @sanity and @feature-a', () => {
  assert.equal(2, 2);
});

it('low-priority-test', () => {
  assert.equal(3, 3);
});
