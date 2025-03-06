/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stripBadDefault } from './utils';

test.each([
  [{}, {}],
  [{ type: 'object' }, { type: 'object' }],
  [{ type: 'object', default: { special: 'deep' } }, { type: 'object' }],
  [
    { type: 'object', default: { special: 'deep', another: 1 } },
    { type: 'object', default: { another: 1 } },
  ],
  [
    { type: 'object', default: () => ({ special: 'deep', another: 1 }) }, // will not strip "special: 'deep'" in this case
    { type: 'object', default: { another: 1, special: 'deep' } },
  ],
])('stripBadDefault %#', (input, output) => {
  stripBadDefault(input as any);
  expect(input).toEqual(output);
});
