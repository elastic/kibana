/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Either from './either';
import { noop } from './utils';

const pluck = (x) => (obj) => obj[x];
const expectNull = (x) => expect(x).toBeNull();
const attempt = (obj) => Either.fromNullable(obj).map(pluck('detail'));

describe(`either datatype functions`, () => {
  describe(`helpers`, () => {
    it(`'fromNullable' should be a fn`, () => {
      expect(typeof Either.fromNullable).toBe('function');
    });
    it(`' Either.tryCatch' should be a fn`, () => {
      expect(typeof Either.tryCatch).toBe('function');
    });
    it(`'left' should be a fn`, () => {
      expect(typeof Either.left).toBe('function');
    });
    it(`'right' should be a fn`, () => {
      expect(typeof Either.right).toBe('function');
    });
  });
  describe(' Either.tryCatch', () => {
    let sut = undefined;
    it(`should return a 'Left' on error`, () => {
      sut = Either.tryCatch(() => {
        throw new Error('blah');
      });
      expect(sut.inspect()).toBe('Left(Error: blah)');
    });
    it(`should return a 'Right' on successful execution`, () => {
      sut = Either.tryCatch(noop);
      expect(sut.inspect()).toBe('Right(undefined)');
    });
  });
  describe(`fromNullable`, () => {
    it(`should continue processing if a truthy is calculated`, () => {
      attempt({ detail: 'x' }).fold(
        () => {},
        (x) => expect(x).toBe('x')
      );
    });
    it(`should drop processing if a falsey is calculated`, () => {
      attempt(false).fold(expectNull, () => {});
    });
  });
  describe(`predicate fns`, () => {
    it(`right.isRight() is true`, () => {
      expect(Either.right('a').isRight()).toBe(true);
    });
    it(`right.isLeft() is false`, () => {
      expect(Either.right('a').isLeft()).toBe(false);
    });
    it(`left.isLeft() is true`, () => {
      expect(Either.left().isLeft()).toBe(true);
    });
    it(`left.isRight() is true`, () => {
      expect(Either.left().isRight()).toBe(false);
    });
  });
});
