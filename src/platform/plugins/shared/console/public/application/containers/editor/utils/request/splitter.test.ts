/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitRequestDataObjects } from './splitter';

describe('splitter', () => {
  it('SHOULD split concatenated request objects', () => {
    expect(splitRequestDataObjects('{"first":true}{"second":true}')).toEqual([
      '{"first":true}',
      '{"second":true}',
    ]);
  });

  it('SHOULD preserve braces within strings', () => {
    expect(splitRequestDataObjects('{"query":"{a} {b}"}')).toEqual(['{"query":"{a} {b}"}']);
  });

  it('SHOULD preserve invalid request data', () => {
    expect(splitRequestDataObjects('{"query":')).toEqual(['{"query":']);
  });
});
