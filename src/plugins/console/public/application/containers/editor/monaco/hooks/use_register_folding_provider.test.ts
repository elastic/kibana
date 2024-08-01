/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFoldingRanges } from './use_register_folding_provider';

describe('getFoldingRanges', () => {
  // Sample test input visualization:
  // 1  PUT /test/_doc/1
  // 2  {
  // 3    "some_key": {
  // 4      "some_inner_key": """{
  // 5        "multi_line": "json string"
  // 6        }""",
  // 7      "some_other_key": 123
  // 8    },
  // 9    "outer_key_2": "{test"
  // 10 }

  const SAMPLE_INPUT = [
    'PUT /test/_doc/1',
    '{  ',
    '  "some_key": {  ',
    '    "some_inner_key": """{',
    '      "multi_line": "json string"',
    '      }""",',
    '    "some_other_key": 123',
    '  },',
    '  "outer_key_2": "{test"',
    '  }',
  ];

  it('returns correct ranges', () => {
    const expectedRanges = [
      { start: 3, end: 8 },
      { start: 2, end: 10 },
    ];
    expect(getFoldingRanges(SAMPLE_INPUT)).toEqual(expectedRanges);
  });
});
