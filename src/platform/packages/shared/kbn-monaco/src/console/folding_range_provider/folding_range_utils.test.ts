/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFoldingRanges } from './folding_range_utils';

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
  // 9    "outer_key_2": [
  // 10    1,
  // 11    2,
  // 12    3
  // 13   ]
  // 14 }

  const SAMPLE_INPUT = [
    'PUT /test/_doc/1',
    '{  ',
    '  "some_key": {  ',
    '    "some_inner_key": """{',
    '      "multi_line": "json string"',
    '      }""",',
    '    "some_other_key": 123',
    '  },',
    '  "outer_key_2": [',
    '    1,',
    '    2,',
    '    3',
    '  ]',
    '}',
  ];

  it('returns correct ranges for parentheses', () => {
    const expectedRanges = [
      { start: 3, end: 7 },
      { start: 2, end: 13 },
    ];
    expect(getFoldingRanges(SAMPLE_INPUT, '{', '}')).toEqual(expectedRanges);
  });

  it('returns correct ranges for square brackets', () => {
    const expectedRanges = [{ start: 9, end: 12 }];
    expect(getFoldingRanges(SAMPLE_INPUT, '[', ']')).toEqual(expectedRanges);
  });
});
