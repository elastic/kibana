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

import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../constants';

import {
  ILLEGAL_CHARACTERS,
  CONTAINS_SPACES,
  validateIndexPattern,
} from './validate_index_pattern';

describe('Index Pattern Validation', () => {
  it('should not allow space in the pattern', () => {
    const errors = validateIndexPattern('my pattern');
    expect(errors[CONTAINS_SPACES]).toBe(true);
  });

  it('should not allow illegal characters', () => {
    INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.forEach((char) => {
      const errors = validateIndexPattern(`pattern${char}`);
      expect(errors[ILLEGAL_CHARACTERS]).toEqual([ char ]);
    });
  });

  it('should return empty object when there are no errors', () => {
    expect(validateIndexPattern('my-pattern-*')).toEqual({});
  });
});
