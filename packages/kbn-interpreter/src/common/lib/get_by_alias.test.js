/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getByAlias } from './get_by_alias';

describe('getByAlias', () => {
  const fnsObject = {
    foo: { name: 'foo', aliases: ['f'] },
    bar: { name: 'bar', aliases: ['b'] },
  };

  const fnsArray = [
    { name: 'foo', aliases: ['f'] },
    { name: 'bar', aliases: ['b'] },
  ];

  it('returns the function by name', () => {
    expect(getByAlias(fnsObject, 'foo')).toBe(fnsObject.foo);
    expect(getByAlias(fnsObject, 'bar')).toBe(fnsObject.bar);
    expect(getByAlias(fnsArray, 'foo')).toBe(fnsArray[0]);
    expect(getByAlias(fnsArray, 'bar')).toBe(fnsArray[1]);
  });

  it('returns the function by alias', () => {
    expect(getByAlias(fnsObject, 'f')).toBe(fnsObject.foo);
    expect(getByAlias(fnsObject, 'b')).toBe(fnsObject.bar);
    expect(getByAlias(fnsArray, 'f')).toBe(fnsArray[0]);
    expect(getByAlias(fnsArray, 'b')).toBe(fnsArray[1]);
  });

  it('returns the function by case-insensitive name', () => {
    expect(getByAlias(fnsObject, 'FOO')).toBe(fnsObject.foo);
    expect(getByAlias(fnsObject, 'BAR')).toBe(fnsObject.bar);
    expect(getByAlias(fnsArray, 'FOO')).toBe(fnsArray[0]);
    expect(getByAlias(fnsArray, 'BAR')).toBe(fnsArray[1]);
  });

  it('returns the function by case-insensitive alias', () => {
    expect(getByAlias(fnsObject, 'F')).toBe(fnsObject.foo);
    expect(getByAlias(fnsObject, 'B')).toBe(fnsObject.bar);
    expect(getByAlias(fnsArray, 'F')).toBe(fnsArray[0]);
    expect(getByAlias(fnsArray, 'B')).toBe(fnsArray[1]);
  });

  it('handles empty strings', () => {
    const emptyStringFnsObject = { '': { name: '' } };
    const emptyStringAliasFnsObject = { foo: { name: 'foo', aliases: [''] } };
    expect(getByAlias(emptyStringFnsObject, '')).toBe(emptyStringFnsObject['']);
    expect(getByAlias(emptyStringAliasFnsObject, '')).toBe(emptyStringAliasFnsObject.foo);

    const emptyStringFnsArray = [{ name: '' }];
    const emptyStringAliasFnsArray = [{ name: 'foo', aliases: [''] }];
    expect(getByAlias(emptyStringFnsArray, '')).toBe(emptyStringFnsArray[0]);
    expect(getByAlias(emptyStringAliasFnsArray, '')).toBe(emptyStringAliasFnsArray[0]);
  });

  it('handles "undefined" strings', () => {
    const undefinedFnsObject = { undefined: { name: 'undefined' } };
    const undefinedAliasFnsObject = { foo: { name: 'undefined', aliases: ['undefined'] } };
    expect(getByAlias(undefinedFnsObject, 'undefined')).toBe(undefinedFnsObject.undefined);
    expect(getByAlias(undefinedAliasFnsObject, 'undefined')).toBe(undefinedAliasFnsObject.foo);

    const emptyStringFnsArray = [{ name: 'undefined' }];
    const emptyStringAliasFnsArray = [{ name: 'foo', aliases: ['undefined'] }];
    expect(getByAlias(emptyStringFnsArray, 'undefined')).toBe(emptyStringFnsArray[0]);
    expect(getByAlias(emptyStringAliasFnsArray, 'undefined')).toBe(emptyStringAliasFnsArray[0]);
  });

  it('returns undefined if not found', () => {
    expect(getByAlias(fnsObject, 'baz')).toBe(undefined);
    expect(getByAlias(fnsArray, 'baz')).toBe(undefined);
  });
});
