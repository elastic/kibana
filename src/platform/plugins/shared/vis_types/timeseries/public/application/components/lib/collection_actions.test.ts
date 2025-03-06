/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  handleChange,
  handleAdd,
  handleDelete,
  CollectionActionsProps,
} from './collection_actions';

describe('collection actions', () => {
  test('handleChange() calls props.onChange() with updated collection', () => {
    const fn = jest.fn();
    const props = {
      model: { test: [{ id: '1', title: 'foo' }] },
      name: 'test',
      onChange: fn,
    } as unknown as CollectionActionsProps<any>;
    handleChange.call(null, props, { id: '1', type: 'bar' });
    expect(fn.mock.calls.length).toEqual(1);
    expect(fn.mock.calls[0][0]).toEqual({
      test: [{ id: '1', type: 'bar' }],
    });
  });

  test('handleAdd() calls props.onChange() with update collection', () => {
    const newItemFn = jest.fn(() => ({ id: '2', text: 'example' }));
    const fn = jest.fn();
    const props = {
      model: { test: [{ id: '1', text: 'foo' }] },
      name: 'test',
      onChange: fn,
    } as unknown as CollectionActionsProps<any>;
    handleAdd.call(null, props, newItemFn);
    expect(fn.mock.calls.length).toEqual(1);
    expect(newItemFn.mock.calls.length).toEqual(1);
    expect(fn.mock.calls[0][0]).toEqual({
      test: [
        { id: '1', text: 'foo' },
        { id: '2', text: 'example' },
      ],
    });
  });

  test('handleDelete() calls props.onChange() with update collection', () => {
    const fn = jest.fn();
    const props = {
      model: { test: [{ id: '1', title: 'foo' }] },
      name: 'test',
      onChange: fn,
    } as unknown as CollectionActionsProps<any>;
    handleDelete.call(null, props, { id: '1' });
    expect(fn.mock.calls.length).toEqual(1);
    expect(fn.mock.calls[0][0]).toEqual({
      test: [],
    });
  });
});
