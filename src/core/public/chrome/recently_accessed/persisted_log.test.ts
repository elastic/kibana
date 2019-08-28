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

import { PersistedLog } from './persisted_log';

const createMockStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

jest.mock('ui/chrome', () => {
  return {
    getBasePath: () => `/some/base/path`,
  };
});

const historyName = 'testHistory';
const historyLimit = 10;
const payload = [
  { first: 'clark', last: 'kent' },
  { first: 'peter', last: 'parker' },
  { first: 'bruce', last: 'wayne' },
];

describe('PersistedLog', () => {
  let storage = createMockStorage();
  beforeEach(() => {
    storage = createMockStorage();
  });

  describe('expected API', () => {
    test('has expected methods', () => {
      const log = new PersistedLog(historyName, { maxLength: 10 }, storage);

      expect(typeof log.add).toBe('function');
      expect(typeof log.get).toBe('function');
    });
  });

  describe('internal functionality', () => {
    test('reads from storage', () => {
      // @ts-ignore
      const log = new PersistedLog(historyName, { maxLength: 10 }, storage);

      expect(storage.getItem).toHaveBeenCalledTimes(1);
      expect(storage.getItem).toHaveBeenCalledWith(historyName);
    });

    test('writes to storage', () => {
      const log = new PersistedLog(historyName, { maxLength: 10 }, storage);
      const newItem = { first: 'diana', last: 'prince' };

      const data = log.add(newItem);

      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(data).toEqual([newItem]);
    });
  });

  describe('persisting data', () => {
    test('fetches records from storage', () => {
      storage.getItem.mockReturnValue(JSON.stringify(payload));
      const log = new PersistedLog(historyName, { maxLength: 10 }, storage);

      const items = log.get();
      expect(items.length).toBe(3);
      expect(items).toEqual(payload);
    });

    test('prepends new records', () => {
      storage.getItem.mockReturnValue(JSON.stringify(payload.slice(0)));
      const log = new PersistedLog(historyName, { maxLength: 10 }, storage);
      const newItem = { first: 'selina', last: 'kyle' };

      const items = log.add(newItem);
      expect(items.length).toBe(payload.length + 1);
      expect(items[0]).toEqual(newItem);
    });
  });

  describe('stack options', () => {
    test('should observe the maxLength option', () => {
      const bulkData = [];

      for (let i = 0; i < historyLimit; i++) {
        bulkData.push(['record ' + i]);
      }
      storage.getItem.mockReturnValue(JSON.stringify(bulkData));

      const log = new PersistedLog(historyName, { maxLength: historyLimit }, storage);
      log.add(['new array 1']);
      const items = log.add(['new array 2']);

      expect(items.length).toBe(historyLimit);
    });

    test('should observe the filterDuplicates option', () => {
      storage.getItem.mockReturnValue(JSON.stringify(payload.slice(0)));
      const log = new PersistedLog(historyName, { maxLength: 10 }, storage);
      const newItem = payload[1];

      const items = log.add(newItem);
      expect(items.length).toBe(payload.length);
    });

    test('should truncate the list upon initialization if too long', () => {
      storage.getItem.mockReturnValue(JSON.stringify(payload.slice(0)));
      const log = new PersistedLog(historyName, { maxLength: 1 }, storage);
      const items = log.get();
      expect(items.length).toBe(1);
    });

    test('should allow a maxLength of 0', () => {
      storage.getItem.mockReturnValue(JSON.stringify(payload.slice(0)));
      const log = new PersistedLog(historyName, { maxLength: 0 }, storage);
      const items = log.get();
      expect(items.length).toBe(0);
    });
  });
});
