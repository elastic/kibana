/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { deepFreeze } from './deep_freeze';

it('returns the first argument with all original references', () => {
  const a = {};
  const b = {};
  const c = { a, b };

  const frozen = deepFreeze(c);
  expect(frozen).toBe(c);
  expect(frozen.a).toBe(a);
  expect(frozen.b).toBe(b);
});

it('prevents adding properties to argument', () => {
  const frozen = deepFreeze({});
  expect(() => {
    // ts knows this shouldn't be possible, but just making sure
    // @ts-expect-error
    frozen.foo = true;
  }).toThrowError(`object is not extensible`);
});

it('prevents changing properties on argument', () => {
  const frozen = deepFreeze({ foo: false });
  expect(() => {
    // ts knows this shouldn't be possible, but just making sure
    // @ts-expect-error
    frozen.foo = true;
  }).toThrowError(`read only property 'foo'`);
});

it('prevents changing properties on nested children of argument', () => {
  const frozen = deepFreeze({ foo: { bar: { baz: { box: 1 } } } });
  expect(() => {
    // ts knows this shouldn't be possible, but just making sure
    // @ts-expect-error
    frozen.foo.bar.baz.box = 2;
  }).toThrowError(`read only property 'box'`);
});

it('prevents adding items to a frozen array', () => {
  const frozen = deepFreeze({ foo: [1] });
  expect(() => {
    // ts knows this shouldn't be possible, but just making sure
    // @ts-expect-error
    frozen.foo.push(2);
  }).toThrowError(`object is not extensible`);
});

it('prevents reassigning items in a frozen array', () => {
  const frozen = deepFreeze({ foo: [1] });
  expect(() => {
    // ts knows this shouldn't be possible, but just making sure
    // @ts-expect-error
    frozen.foo[0] = 2;
  }).toThrowError(`read only property '0'`);
});
