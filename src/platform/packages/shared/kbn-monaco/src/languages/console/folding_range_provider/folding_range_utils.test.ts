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
  // 4      "some_inner_key": """
  // 5        "multi_line_json": { // Should ignore this parenthesis
  // 6          "foo": "bar"
  // 7        } // Should ignore this parenthesis
  // 8      """,
  // 9      "some_other_key": 123
  // 10   },
  // 11   "outer_key_2": [
  // 12     1,
  // 13     2,
  // 14     3
  // 15   ]
  // 16 }

  const SAMPLE_INPUT = [
    'PUT /test/_doc/1',
    '{  ',
    '  "some_key": {  ',
    '    "some_inner_key": """',
    '      "multi_line_json": {',
    '        "foo": "bar',
    '      }',
    '    """,',
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
      { start: 3, end: 9 },
      { start: 2, end: 15 },
    ];
    expect(getFoldingRanges(SAMPLE_INPUT, '{', '}')).toEqual(expectedRanges);
  });

  it('returns correct ranges for square brackets', () => {
    const expectedRanges = [{ start: 11, end: 14 }];
    expect(getFoldingRanges(SAMPLE_INPUT, '[', ']')).toEqual(expectedRanges);
  });
});
