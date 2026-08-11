/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { indentData } from './formatter';

describe('formatter', () => {
  it('SHOULD indent valid request data', () => {
    expect(indentData('{"query":{"match_all":{}}}')).toBe(
      ['{', '  "query": {', '    "match_all": {}', '  }', '}'].join('\n')
    );
  });

  it('SHOULD preserve invalid request data', () => {
    expect(indentData('{"query":')).toBe('{"query":');
  });
});
