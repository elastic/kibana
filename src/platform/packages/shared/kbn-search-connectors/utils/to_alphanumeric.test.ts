/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toAlphanumeric } from './to_alphanumeric';

describe('toAlphanumeric', () => {
  it('replaces non-alphanumeric characters with dashes', () => {
    expect(toAlphanumeric('f1  &&o$ 1  2 *&%da')).toEqual('f1-o-1-2-da');
  });

  it('strips leading and trailing non-alphanumeric characters', () => {
    expect(toAlphanumeric('$$hello world**')).toEqual('hello-world');
  });

  it('strips leading and trailing whitespace', () => {
    expect(toAlphanumeric('  test  ')).toEqual('test');
  });

  it('lowercases text', () => {
    expect(toAlphanumeric('SomeName')).toEqual('somename');
  });
});
