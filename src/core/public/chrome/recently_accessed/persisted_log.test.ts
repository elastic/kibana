/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      // @ts-expect-error
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
