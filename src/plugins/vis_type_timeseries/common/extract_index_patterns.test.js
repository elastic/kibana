/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractIndexPatterns } from './extract_index_patterns';

describe('extractIndexPatterns(vis)', () => {
  let visParams;
  let visFields;

  beforeEach(() => {
    visFields = {
      '*': [],
    };
    visParams = {
      index_pattern: '*',
      series: [
        {
          override_index_pattern: 1,
          series_index_pattern: 'example-1-*',
        },
        {
          override_index_pattern: 1,
          series_index_pattern: 'example-2-*',
        },
      ],
      annotations: [{ index_pattern: 'notes-*' }, { index_pattern: 'example-1-*' }],
    };
  });

  test('should return index patterns', () => {
    visFields = {};

    expect(extractIndexPatterns(visParams, visFields)).toEqual([
      '*',
      'example-1-*',
      'example-2-*',
      'notes-*',
    ]);
  });

  test('should return index patterns that do not exist in visFields', () => {
    expect(extractIndexPatterns(visParams, visFields)).toEqual([
      'example-1-*',
      'example-2-*',
      'notes-*',
    ]);
  });
});
