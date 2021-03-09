/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  extractIndexPatterns,
  isStringTypeIndexPattern,
  convertIndexPatternObjectToStringRepresentation,
} from './index_patterns_utils';
import { PanelSchema } from './types';

describe('isStringTypeIndexPattern', () => {
  test('should returns true on string-based index', () => {
    expect(isStringTypeIndexPattern('index')).toBeTruthy();
  });
  test('should returns false on object-based index', () => {
    expect(isStringTypeIndexPattern({ title: 'title', id: 'id' })).toBeFalsy();
  });
});

describe('convertIndexPatternObjectToStringRepresentation', () => {
  test('should return the correct title on getting string-based index', () => {
    expect(convertIndexPatternObjectToStringRepresentation('index')).toBe('index');
  });
  test('should return the correct title on getting object-based index', () => {
    expect(convertIndexPatternObjectToStringRepresentation({ title: 'title', id: 'id' })).toBe(
      'title'
    );
  });
});

describe('extractIndexPatterns', () => {
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
