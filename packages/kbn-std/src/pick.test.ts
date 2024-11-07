/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from './pick';

describe('pick', () => {
  it('works with object created inline', () => {
    const obj = { foo: 'bar', hello: 'dolly' };

    const result = pick(obj, ['foo']);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('works with objects created via Object.create(null)', () => {
    const obj = Object.create(null);
    Object.assign(obj, { foo: 'bar', hello: 'dolly' });

    const result = pick(obj, ['foo']);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('does not pick properties from the prototype', () => {
    const proto = { prot: 'o' };
    const obj = Object.create(proto);
    Object.assign(obj, { foo: 'bar', hello: 'dolly' });

    const result = pick(obj, ['foo', 'prot']);
    expect(result).toEqual({ foo: 'bar' });
  });
});
