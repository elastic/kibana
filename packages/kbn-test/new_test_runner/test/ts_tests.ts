/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { it } from 'node:test';
import assert from 'node:assert/strict';

interface Person {
  name: string;
}

it('subtest 1', () => {
  // eslint-disable-next-line no-console
  console.log('testing the person');
  const p: Person = {
    name: 'Joe',
  };
  assert.deepEqual(p, { name: 'Joe' });
});
