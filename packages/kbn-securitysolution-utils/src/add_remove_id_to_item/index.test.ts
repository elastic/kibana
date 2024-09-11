/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addIdToItem, removeIdFromItem } from '.';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

describe('add_remove_id_to_item', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addIdToItem', () => {
    test('it adds an id to an empty item', () => {
      expect(addIdToItem({})).toEqual({ id: '123' });
    });

    test('it adds a complex object', () => {
      expect(
        addIdToItem({
          field: '',
          type: 'mapping',
          value: '',
        })
      ).toEqual({
        id: '123',
        field: '',
        type: 'mapping',
        value: '',
      });
    });

    test('it adds an id to an existing item', () => {
      expect(addIdToItem({ test: '456' })).toEqual({ id: '123', test: '456' });
    });

    test('it does not change the id if it already exists', () => {
      expect(addIdToItem({ id: '456' })).toEqual({ id: '456' });
    });

    test('it returns the same reference if it has an id already', () => {
      const obj = { id: '456' };
      expect(addIdToItem(obj)).toBe(obj);
    });

    test('it returns a new reference if it adds an id to an item', () => {
      const obj = { test: '456' };
      expect(addIdToItem(obj)).not.toBe(obj);
    });
  });

  describe('removeIdFromItem', () => {
    test('it removes an id from an item', () => {
      expect(removeIdFromItem({ id: '456' })).toEqual({});
    });

    test('it returns a new reference if it removes an id from an item', () => {
      const obj = { id: '123', test: '456' };
      expect(removeIdFromItem(obj)).not.toBe(obj);
    });

    test('it does not effect an item without an id', () => {
      expect(removeIdFromItem({ test: '456' })).toEqual({ test: '456' });
    });

    test('it returns the same reference if it does not have an id already', () => {
      const obj = { test: '456' };
      expect(removeIdFromItem(obj)).toBe(obj);
    });
  });
});
