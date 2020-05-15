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
