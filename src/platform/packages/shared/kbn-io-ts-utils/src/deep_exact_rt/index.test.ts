/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { deepExactRt } from '.';
import { mergeRt } from '../merge_rt';

describe('deepExactRt', () => {
  it('recursively wraps partial/interface types in t.exact', () => {
    const a = t.type({
      path: t.type({
        serviceName: t.string,
      }),
      query: t.type({
        foo: t.string,
      }),
    });

    const b = t.type({
      path: t.type({
        transactionType: t.string,
      }),
    });

    const merged = mergeRt(a, b);

    expect(
      deepExactRt(a).decode({
        path: {
          serviceName: '',
          transactionType: '',
        },
        query: {
          foo: '',
          bar: '',
        },
        // @ts-ignore
      }).right
    ).toEqual({ path: { serviceName: '' }, query: { foo: '' } });

    expect(
      deepExactRt(b).decode({
        path: {
          serviceName: '',
          transactionType: '',
        },
        query: {
          foo: '',
          bar: '',
        },
        // @ts-ignore
      }).right
    ).toEqual({ path: { transactionType: '' } });

    expect(
      deepExactRt(merged).decode({
        path: {
          serviceName: '',
          transactionType: '',
        },
        query: {
          foo: '',
          bar: '',
        },
        // @ts-ignore
      }).right
    ).toEqual({ path: { serviceName: '', transactionType: '' }, query: { foo: '' } });
  });
});
