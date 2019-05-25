/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      }
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
