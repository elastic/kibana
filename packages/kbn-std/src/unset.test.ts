/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { unset } from './unset';

describe('unset', () => {
  it('deletes a property from an object', () => {
    const obj = {
      a: 'a',
      b: 'b',
      c: 'c',
    };
    unset(obj, 'a');
    expect(obj).toEqual({
      b: 'b',
      c: 'c',
    });
  });

  it('does nothing if the property is not present', () => {
    const obj = {
      a: 'a',
      b: 'b',
      c: 'c',
    };
    unset(obj, 'd');
    expect(obj).toEqual({
      a: 'a',
      b: 'b',
      c: 'c',
    });
  });

  it('handles nested paths', () => {
    const obj = {
      foo: {
        bar: {
          one: 'one',
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    };
    unset(obj, 'foo.bar.one');
    expect(obj).toEqual({
      foo: {
        bar: {
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    });
  });

  it('does nothing if nested paths does not exist', () => {
    const obj = {
      foo: {
        bar: {
          one: 'one',
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    };
    unset(obj, 'foo.nothere.baz');
    expect(obj).toEqual({
      foo: {
        bar: {
          one: 'one',
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    });
  });
});
