/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

  expect(emits.length).toEqual(2);
  expect(emits).toMatchInlineSnapshot(`
    Array [
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

  expect(emits.length).toEqual(3);
  expect(emits).toMatchInlineSnapshot(`
    Array [
      "bar",
      "baaaar",
      null,
    ]
  `);
});
