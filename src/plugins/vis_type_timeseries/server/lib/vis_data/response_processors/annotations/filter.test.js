/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { makeFilter, annotationFilter } from './filter';

describe('src/legacy/core_plugins/metrics/server/lib/vis_data/response_processors/annotations/annotations.js', () => {
  let annotations;

  beforeEach(() => {
    annotations = [
      {
        key: 100,
      },
      {
        key: 1000,
      },
      {
        key: 10000,
      },
    ];
  });

  describe('makeFilter()', () => {
    test('should call accepted filter with accepted data and value', () => {
      const by = jest.fn();
      const value = 42;
      const data = [];

      makeFilter(by)(value)(data);

      expect(by).toHaveBeenCalledWith(data, value);
    });
  });

  describe('annotationFilter()', () => {
    test('should filter annotations by passed value correctly', () => {
      const expectedResult = [
        {
          key: 100,
        },
        {
          key: 1000,
        },
      ];

      expect(annotationFilter(annotations, 1000)).toEqual(expectedResult);
    });
  });
});
