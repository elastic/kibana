/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PersistedLog } from './persisted_log';

const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  store: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
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
      const log = new PersistedLog(historyName, {}, storage);

      expect(typeof log.add).toBe('function');
      expect(typeof log.get).toBe('function');
    });
  });

  describe('internal functionality', () => {
    test('reads from storage', () => {
      // @ts-ignore
      const log = new PersistedLog(historyName, {}, storage);

      expect(storage.get).toHaveBeenCalledTimes(1);
      expect(storage.get).toHaveBeenCalledWith(historyName);
    });

    test('writes to storage', () => {
      const log = new PersistedLog(historyName, {}, storage);
      const newItem = { first: 'diana', last: 'prince' };

      const data = log.add(newItem);

      expect(storage.set).toHaveBeenCalledTimes(1);
      expect(data).toEqual([newItem]);
    });
  });

  describe('persisting data', () => {
    test('fetches records from storage', () => {
      storage.get.mockReturnValue(payload);
      const log = new PersistedLog(historyName, {}, storage);

      const items = log.get();
      expect(items.length).toBe(3);
      expect(items).toEqual(payload);
    });

    test('prepends new records', () => {
      storage.get.mockReturnValue(payload.slice(0));
      const log = new PersistedLog(historyName, {}, storage);
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
      storage.get.mockReturnValue(bulkData);

      const log = new PersistedLog(historyName, { maxLength: historyLimit }, storage);
      log.add(['new array 1']);
      const items = log.add(['new array 2']);

      expect(items.length).toBe(historyLimit);
    });

    test('should observe the filterDuplicates option', () => {
      storage.get.mockReturnValue(payload.slice(0));
      const log = new PersistedLog(historyName, { filterDuplicates: true }, storage);
      const newItem = payload[1];

      const items = log.add(newItem);
      expect(items.length).toBe(payload.length);
    });

    test('should truncate the list upon initialization if too long', () => {
      storage.get.mockReturnValue(payload.slice(0));
      const log = new PersistedLog(historyName, { maxLength: 1 }, storage);
      const items = log.get();
      expect(items.length).toBe(1);
    });

    test('should allow a maxLength of 0', () => {
      storage.get.mockReturnValue(payload.slice(0));
      const log = new PersistedLog(historyName, { maxLength: 0 }, storage);
      const items = log.get();
      expect(items.length).toBe(0);
    });
  });
});
