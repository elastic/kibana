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

import { validateRetries } from './validate_retries';
import { SavedObjectsImportRetry } from '.';

import { getNonUniqueEntries } from './get_non_unique_entries';
jest.mock('./get_non_unique_entries');
const mockGetNonUniqueEntries = getNonUniqueEntries as jest.MockedFunction<
  typeof getNonUniqueEntries
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetNonUniqueEntries.mockReturnValue([]);
});

describe('#validateRetries', () => {
  const createRetry = (object: unknown) => object as SavedObjectsImportRetry;

  describe('module calls', () => {
    test('empty retries', () => {
      validateRetries([]);
      expect(getNonUniqueEntries).toHaveBeenCalledTimes(2);
      expect(getNonUniqueEntries).toHaveBeenNthCalledWith(1, []);
      expect(getNonUniqueEntries).toHaveBeenNthCalledWith(2, []);
    });

    test('non-empty retries', () => {
      const retry1 = createRetry({ type: 'foo', id: '1' });
      const retry2 = createRetry({ type: 'foo', id: '2', overwrite: true });
      const retry3 = createRetry({ type: 'foo', id: '3', destinationId: 'a' });
      const retry4 = createRetry({ type: 'foo', id: '4', overwrite: true, destinationId: 'b' });
      const retries = [retry1, retry2, retry3, retry4];
      validateRetries(retries);
      expect(getNonUniqueEntries).toHaveBeenCalledTimes(2);
      // check all retry objects for non-unique entries
      expect(getNonUniqueEntries).toHaveBeenNthCalledWith(1, retries);
      // check only retry objects with `destinationId` !== undefined for non-unique entries
      const retryOverwriteEntries = [
        { type: retry3.type, id: retry3.destinationId },
        { type: retry4.type, id: retry4.destinationId },
      ];
      expect(getNonUniqueEntries).toHaveBeenNthCalledWith(2, retryOverwriteEntries);
    });
  });

  describe('results', () => {
    test('throws Boom error if any retry objects are not unique', () => {
      mockGetNonUniqueEntries.mockReturnValue(['type1:id1', 'type2:id2']);
      expect.assertions(2);
      try {
        validateRetries([]);
      } catch ({ isBoom, message }) {
        expect(isBoom).toBe(true);
        expect(message).toMatchInlineSnapshot(
          `"Non-unique retry objects: [type1:id1,type2:id2]: Bad Request"`
        );
      }
    });

    test('throws Boom error if any retry destinations are not unique', () => {
      mockGetNonUniqueEntries.mockReturnValueOnce([]);
      mockGetNonUniqueEntries.mockReturnValue(['type1:id1', 'type2:id2']);
      expect.assertions(2);
      try {
        validateRetries([]);
      } catch ({ isBoom, message }) {
        expect(isBoom).toBe(true);
        expect(message).toMatchInlineSnapshot(
          `"Non-unique retry destinations: [type1:id1,type2:id2]: Bad Request"`
        );
      }
    });

    test('does not throw error if retry objects and retry destinations are unique', () => {
      // no need to mock return value, the mock `getNonUniqueEntries` function returns an empty array by default
      expect(() => validateRetries([])).not.toThrowError();
    });
  });
});
