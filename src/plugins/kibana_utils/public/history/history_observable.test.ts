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

import {
  createHistoryObservable,
  createQueryParamObservable,
  createQueryParamsObservable,
} from './history_observable';
import { createMemoryHistory, History } from 'history';
import { ParsedQuery } from 'query-string';

let history: History;

beforeEach(() => {
  history = createMemoryHistory();
});

test('createHistoryObservable', () => {
  const obs$ = createHistoryObservable(history);
  const emits: string[] = [];
  obs$.subscribe(({ location }) => {
    emits.push(location.pathname + location.search);
  });

  history.push('/test');
  history.push('/');

  expect(emits.length).toEqual(2);
  expect(emits).toMatchInlineSnapshot(`
    Array [
      "/test",
      "/",
    ]
  `);
});

test('createQueryParamsObservable', () => {
  const obs$ = createQueryParamsObservable(history);
  const emits: ParsedQuery[] = [];
  obs$.subscribe((params) => {
    emits.push(params);
  });

  history.push('/test');
  history.push('/test?foo=bar');
  history.push('/?foo=bar');
  history.push('/test?foo=bar&foo1=bar1');

  expect(emits.length).toEqual(3);
  expect(emits).toMatchInlineSnapshot(`
    Array [
      Object {},
      Object {
        "foo": "bar",
      },
      Object {
        "foo": "bar",
        "foo1": "bar1",
      },
    ]
  `);
});

test('createQueryParamObservable', () => {
  const obs$ = createQueryParamObservable(history, 'foo');
  const emits: unknown[] = [];
  obs$.subscribe((param) => {
    emits.push(param);
  });

  history.push('/test');
  history.push('/test?foo=bar');
  history.push('/?foo=bar');
  history.push('/test?foo=baaaar&foo1=bar1');
  history.push('/test?foo1=bar1');

  expect(emits.length).toEqual(4);
  expect(emits).toMatchInlineSnapshot(`
    Array [
      null,
      "bar",
      "baaaar",
      null,
    ]
  `);
});
