/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extractIndexPatterns } from './extract_index_patterns';
import { PanelSchema } from './types';

describe('extractIndexPatterns(vis)', () => {
  let panel: PanelSchema;

  beforeEach(() => {
    panel = {
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
    } as PanelSchema;
  });

  test('should return index patterns', () => {
    expect(extractIndexPatterns(panel, '')).toEqual(['*', 'example-1-*', 'example-2-*', 'notes-*']);
  });
});
