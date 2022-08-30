/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogMeta } from '@kbn/logging';
import { GlobalContext } from './types';
import { mergeGlobalContext } from './merge_global_context';

describe('mergeGlobalContext', () => {
  test('inserts global meta in entry meta', () => {
    const context: GlobalContext = {
      bar: false,
    };
    const meta: LogMeta = {
      // @ts-expect-error Custom ECS field
      foo: true,
    };

    expect(mergeGlobalContext(context, meta)).toEqual({
      foo: true,
      bar: false,
    });
  });

  test('handles nested context', () => {
    const context: GlobalContext = {
      'bar.baz': false,
    };
    const meta: LogMeta = {
      // @ts-expect-error Custom ECS field
      foo: true,
    };

    expect(mergeGlobalContext(context, meta)).toEqual({
      foo: true,
      bar: { baz: false },
    });
  });

  test('does not overwrite meta with global context if the path already exists', () => {
    const context: GlobalContext = {
      foo: false,
      bar: [false],
    };
    const meta: LogMeta = {
      // @ts-expect-error Custom ECS field
      foo: true,
      bar: [true],
    };

    expect(mergeGlobalContext(context, meta)).toEqual({
      foo: true,
      bar: [true],
    });
  });

  test('if conflicting entries exist in the context, the most specific entry wins', () => {
    const context: GlobalContext = {
      'a.b.c': 'd',
      'a.b': 'c',
    };

    // Note that this "most specific entry wins" behavior should not happen in practice,
    // as the `LoggingSystem` is handling deconfliction of paths before anything is
    // provided to the `LoggerAdapter` in the first place. Including this test just to
    // ensure the actual behavior of this function is documented for posterity.
    expect(mergeGlobalContext(context)).toEqual({
      a: { b: { c: 'd' } },
    });
  });

  test('does nothing if no global meta has been set', () => {
    const context: GlobalContext = {};
    const meta: LogMeta = {
      // @ts-expect-error Custom ECS field
      foo: true,
    };

    expect(mergeGlobalContext(context, meta)).toEqual({
      foo: true,
    });
  });

  test('adds global meta even if no user-provided meta exists', () => {
    const context: GlobalContext = {
      foo: true,
    };

    expect(mergeGlobalContext(context)).toEqual({
      foo: true,
    });
  });

  test('does nothing if no global meta or user-provided meta has been set', () => {
    const context: GlobalContext = {};

    expect(mergeGlobalContext(context)).toBeUndefined();
  });
});
