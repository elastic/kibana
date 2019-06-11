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

import { createStore } from './create_store';

test('can create store', () => {
  const store = createStore({});
  expect(store).toMatchObject({
    get: expect.any(Function),
    set: expect.any(Function),
    $state: expect.any(Object),
    redux: {
      getState: expect.any(Function),
      dispatch: expect.any(Function),
      subscribe: expect.any(Function),
    },
  });
});

test('can set default state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const store = createStore(defaultState);
  expect(store.get()).toEqual(defaultState);
  expect(store.redux.getState()).toEqual(defaultState);
});

test('can set state', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo: 'baz',
  };
  const store = createStore(defaultState);

  store.set(newState);

  expect(store.get()).toEqual(newState);
  expect(store.redux.getState()).toEqual(newState);
});

test('does not shallow merge states', () => {
  const defaultState = {
    foo: 'bar',
  };
  const newState = {
    foo2: 'baz',
  };
  const store = createStore<any>(defaultState);

  store.set(newState);

  expect(store.get()).toEqual(newState);
  expect(store.redux.getState()).toEqual(newState);
});
