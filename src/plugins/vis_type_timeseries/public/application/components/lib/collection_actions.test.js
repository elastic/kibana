/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { handleChange, handleAdd, handleDelete } from './collection_actions';

describe('collection actions', () => {
  test('handleChange() calls props.onChange() with updated collection', () => {
    const fn = jest.fn();
    const props = {
      model: { test: [{ id: 1, title: 'foo' }] },
      name: 'test',
      onChange: fn,
    };
    handleChange.call(null, props, { id: 1, title: 'bar' });
    expect(fn.mock.calls.length).toEqual(1);
    expect(fn.mock.calls[0][0]).toEqual({
      test: [{ id: 1, title: 'bar' }],
    });
  });

  test('handleAdd() calls props.onChange() with update collection', () => {
    const newItemFn = jest.fn(() => ({ id: 2, title: 'example' }));
    const fn = jest.fn();
    const props = {
      model: { test: [{ id: 1, title: 'foo' }] },
      name: 'test',
      onChange: fn,
    };
    handleAdd.call(null, props, newItemFn);
    expect(fn.mock.calls.length).toEqual(1);
    expect(newItemFn.mock.calls.length).toEqual(1);
    expect(fn.mock.calls[0][0]).toEqual({
      test: [
        { id: 1, title: 'foo' },
        { id: 2, title: 'example' },
      ],
    });
  });

  test('handleDelete() calls props.onChange() with update collection', () => {
    const fn = jest.fn();
    const props = {
      model: { test: [{ id: 1, title: 'foo' }] },
      name: 'test',
      onChange: fn,
    };
    handleDelete.call(null, props, { id: 1 });
    expect(fn.mock.calls.length).toEqual(1);
    expect(fn.mock.calls[0][0]).toEqual({
      test: [],
    });
  });
});
