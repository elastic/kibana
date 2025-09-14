/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';
import type { Simplify, IsAny } from './helper_types';

const types = {
  string: 'some-string',
  number: 123,
};

describe('helper types', () => {
  describe('Simplify', () => {
    it('should only be used on objects', () => {
      // @ts-expect-error
      expectType<Simplify<number>>();
    });
    it('should work on simple objects', () => {
      interface Test {
        str: string;
        num: number;
      }
      expectType<Simplify<Test>>({ str: types.string, num: types.number });
    });
    it('should work on complex objects', () => {
      interface Test {
        str: string;
        num: number;
        deep: Omit<Test, 'deep'>;
      }
      expectType<Simplify<Test>>({
        str: types.string,
        num: types.number,
        deep: {
          str: types.string,
          num: types.number,
        },
      });
    });
  });

  describe('IsAny', () => {
    it('should treat any types as any', () => {
      expectType<IsAny<any>>(true);
    });
    it('should treat all other types as non-any', () => {
      expectType<IsAny<number>>(false);
      expectType<IsAny<string>>(false);
      expectType<IsAny<boolean>>(false);
      expectType<IsAny<true>>(false);
      expectType<IsAny<false>>(false);
      expectType<IsAny<0>>(false);
      expectType<IsAny<1>>(false);
      expectType<IsAny<'string'>>(false);
      expectType<IsAny<{}>>(false);
      expectType<IsAny<number[]>>(false);
      expectType<IsAny<unknown>>(false);
      expectType<IsAny<never>>(false);
    });
  });
});
