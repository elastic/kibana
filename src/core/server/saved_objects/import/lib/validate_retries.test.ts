/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import { validateRetries } from './validate_retries';
import { SavedObjectsImportError } from '../errors';

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
    test('throws import error if any retry objects are not unique', () => {
      mockGetNonUniqueEntries.mockReturnValue(['type1:id1', 'type2:id2']);
      expect.assertions(2);
      try {
        validateRetries([]);
      } catch (e) {
        expect(e).toBeInstanceOf(SavedObjectsImportError);
        expect(e.message).toMatchInlineSnapshot(
          `"Non-unique retry objects: [type1:id1,type2:id2]"`
        );
      }
    });

    test('throws import error if any retry destinations are not unique', () => {
      mockGetNonUniqueEntries.mockReturnValueOnce([]);
      mockGetNonUniqueEntries.mockReturnValue(['type1:id1', 'type2:id2']);
      expect.assertions(2);
      try {
        validateRetries([]);
      } catch (e) {
        expect(e).toBeInstanceOf(SavedObjectsImportError);
        expect(e.message).toMatchInlineSnapshot(
          `"Non-unique retry destinations: [type1:id1,type2:id2]"`
        );
      }
    });

    test('does not throw error if retry objects and retry destinations are unique', () => {
      // no need to mock return value, the mock `getNonUniqueEntries` function returns an empty array by default
      expect(() => validateRetries([])).not.toThrowError();
    });
  });
});
