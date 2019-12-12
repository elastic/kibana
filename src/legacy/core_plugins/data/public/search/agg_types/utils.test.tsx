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

import { isValidJson } from './utils';

jest.mock('ui/new_platform');

const input = {
  valid: '{ "test": "json input" }',
  invalid: 'strings are not json',
};

describe('AggType utils', () => {
  describe('isValidJson', () => {
    it('should return true when empty string', () => {
      expect(isValidJson('')).toBeTruthy();
    });

    it('should return true when undefine', () => {
      expect(isValidJson(undefined as any)).toBeTruthy();
    });

    it('should return false when invalid string', () => {
      expect(isValidJson(input.invalid)).toBeFalsy();
    });

    it('should return true when valid string', () => {
      expect(isValidJson(input.valid)).toBeTruthy();
    });

    it('should return false if a number', () => {
      expect(isValidJson('0')).toBeFalsy();
    });
  });
});
