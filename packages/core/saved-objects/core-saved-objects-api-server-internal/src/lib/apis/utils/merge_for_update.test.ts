/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mergeForUpdate } from './merge_for_update';

describe('mergeForUpdate', () => {
  it('merges top level properties', () => {
    expect(mergeForUpdate({ foo: 'bar', hello: 'dolly' }, { baz: 42 })).toEqual({
      foo: 'bar',
      hello: 'dolly',
      baz: 42,
    });
  });

  it('overrides top level properties', () => {
    expect(mergeForUpdate({ foo: 'bar', hello: 'dolly' }, { baz: 42, foo: '9000' })).toEqual({
      foo: '9000',
      hello: 'dolly',
      baz: 42,
    });
  });

  it('ignores undefined top level properties', () => {
    expect(mergeForUpdate({ foo: 'bar', hello: 'dolly' }, { baz: 42, foo: undefined })).toEqual({
      foo: 'bar',
      hello: 'dolly',
      baz: 42,
    });
  });

  it('merges nested properties', () => {
    expect(
      mergeForUpdate({ nested: { foo: 'bar', hello: 'dolly' } }, { nested: { baz: 42 } })
    ).toEqual({
      nested: {
        foo: 'bar',
        hello: 'dolly',
        baz: 42,
      },
    });
  });

  it('overrides nested properties', () => {
    expect(
      mergeForUpdate(
        { nested: { foo: 'bar', hello: 'dolly' } },
        { nested: { baz: 42, foo: '9000' } }
      )
    ).toEqual({
      nested: {
        foo: '9000',
        hello: 'dolly',
        baz: 42,
      },
    });
  });

  it('ignores undefined nested properties', () => {
    expect(
      mergeForUpdate(
        { nested: { foo: 'bar', hello: 'dolly' } },
        { nested: { baz: 42, foo: undefined } }
      )
    ).toEqual({
      nested: {
        foo: 'bar',
        hello: 'dolly',
        baz: 42,
      },
    });
  });

  it('functions with mixed levels of properties', () => {
    expect(
      mergeForUpdate(
        { rootPropA: 'A', nested: { foo: 'bar', hello: 'dolly', deep: { deeper: 'we need' } } },
        { rootPropB: 'B', nested: { baz: 42, foo: '9000', deep: { deeper: 'we are' } } }
      )
    ).toEqual({
      rootPropA: 'A',
      rootPropB: 'B',
      nested: {
        foo: '9000',
        hello: 'dolly',
        baz: 42,
        deep: {
          deeper: 'we are',
        },
      },
    });
  });
});
