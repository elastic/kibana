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
