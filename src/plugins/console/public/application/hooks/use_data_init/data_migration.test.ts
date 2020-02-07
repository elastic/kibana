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
import { migrateToTextObjects } from './data_migration';
import { createStorage, createHistory, Storage, History } from '../../../services';
import { objectStorageClientMock } from '../../../mocks';
import * as localObjectStorageLib from '../../../lib/local_storage_object_client';
import { ObjectStorageClient } from '../../../types';

const mockLocalStorage: WindowLocalStorage['localStorage'] = {
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  length: 0,
  removeItem: jest.fn(),
  setItem: jest.fn(),
};

describe('Data migration', () => {
  let history: History;
  let storage: Storage;

  beforeEach(() => {
    storage = createStorage({ engine: mockLocalStorage });
    history = createHistory({ storage });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('from legacy localStorage', () => {
    describe('with legacy state', () => {
      it('reads, migrates and deletes', async () => {
        const testLegacyContent = JSON.stringify({ time: 123, content: 'test' });
        (mockLocalStorage.getItem as jest.Mock)
          .mockReturnValueOnce(testLegacyContent)
          .mockReturnValueOnce(testLegacyContent);

        await migrateToTextObjects({
          history,
          objectStorageClient: objectStorageClientMock,
          localObjectStorageMigrationClient: objectStorageClientMock,
        });

        // Assert that object was created.
        const [[{ text }], nextCreateCall] = (objectStorageClientMock.text
          .create as jest.Mock).mock.calls;
        expect(text).toBe('test');
        expect(nextCreateCall).toBeUndefined();

        // Assert that legacy state was deleted.
        const [
          [removeItemCalledWith],
          nothing,
        ] = (mockLocalStorage.removeItem as jest.Mock).mock.calls;
        expect(nothing).toBeUndefined();
        expect(removeItemCalledWith).toBe('sense:editor_state');
      });
    });
    describe('without legacy state', () => {
      it('does nothing', async () => {
        // Do not set up any legacy state.

        await migrateToTextObjects({
          history,
          objectStorageClient: objectStorageClientMock,
          localObjectStorageMigrationClient: objectStorageClientMock,
        });

        // Assert that nothing was created.
        const [newObjectStorageCallArgs] = (objectStorageClientMock.text
          .create as jest.Mock).mock.calls;
        expect(newObjectStorageCallArgs).toBeUndefined();

        // Assert that non-existent state was not deleted.
        const [legacyObjectDeleteArgs] = (mockLocalStorage.removeItem as jest.Mock).mock.calls;
        expect(legacyObjectDeleteArgs).toBeUndefined();
      });
    });
  });

  // TODO: Remove this after 7.7 release because this is just to handle special
  // case logic of moving updated, local data to Saved Objects.
  describe('from updated localStorage', () => {
    let localObjectStorageClient: ObjectStorageClient;

    beforeEach(() => {
      localObjectStorageClient = localObjectStorageLib.create(storage);
    });

    describe('with state', () => {
      const newLocalStorageKey = 'sense:console_local_text-object';

      beforeEach(() => {
        // local keys look like: sense:console_local_text-object_12345
        (mockLocalStorage as any)[newLocalStorageKey] = {};
      });

      afterEach(() => {
        delete (mockLocalStorage as any)[newLocalStorageKey];
      });

      it('reads, migrates and deletes', async () => {
        const testLegacyContent = JSON.stringify({
          createdAt: 123,
          updatedAt: 123,
          text: 'test',
        });
        (mockLocalStorage.getItem as jest.Mock)
          // Bypass legacy check
          .mockReturnValueOnce(undefined)
          .mockReturnValue(testLegacyContent);

        await migrateToTextObjects({
          history,
          objectStorageClient: objectStorageClientMock,
          localObjectStorageMigrationClient: localObjectStorageClient,
        });

        const [[{ text }]] = (objectStorageClientMock.text.create as jest.Mock).mock.calls;
        expect(text).toBe('test');

        const [[deleteItem]] = (mockLocalStorage.removeItem as jest.Mock).mock.calls;
        expect(deleteItem).toBe('sense:console_local_text-object');
      });
    });

    describe('without state', () => {
      it('does nothing', async () => {
        (mockLocalStorage.getItem as jest.Mock)
          // Bypass legacy check
          .mockReturnValueOnce(undefined);

        await migrateToTextObjects({
          history,
          objectStorageClient: objectStorageClientMock,
          localObjectStorageMigrationClient: localObjectStorageClient,
        });

        const [shouldBeUndefined] = (objectStorageClientMock.text.create as jest.Mock).mock.calls;
        expect(shouldBeUndefined).toBeUndefined();
      });
    });
  });
});
