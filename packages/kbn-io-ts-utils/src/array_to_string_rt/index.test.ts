/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';
import { arrayToStringRt } from '.';
import { isRight, Either, isLeft, fold } from 'fp-ts/lib/Either';
import { Right } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';

function getValueOrThrow<TEither extends Either<any, any>>(either: TEither): Right<TEither> {
  const value = pipe(
    either,
    fold(() => {
      throw new Error('cannot get right value of left');
    }, identity)
  );

  return value as Right<TEither>;
}

describe('arrayToStringRt', () => {
  it('should validate strings', () => {
    expect(isRight(arrayToStringRt.decode(''))).toBe(true);
    expect(isRight(arrayToStringRt.decode('message'))).toBe(true);
    expect(isRight(arrayToStringRt.decode('message,event.original'))).toBe(true);
    expect(isLeft(arrayToStringRt.decode({}))).toBe(true);
    expect(isLeft(arrayToStringRt.decode(true))).toBe(true);
  });

  it('should return array of strings when decoding', () => {
    expect(getValueOrThrow(arrayToStringRt.decode(''))).toEqual(['']);
    expect(getValueOrThrow(arrayToStringRt.decode('message'))).toEqual(['message']);
    expect(getValueOrThrow(arrayToStringRt.decode('message,event.original'))).toEqual([
      'message',
      'event.original',
    ]);
  });

  it('should be pipable', () => {
    const piped = arrayToStringRt.pipe(rt.array(rt.string));

    const validInput = ['message', 'event.original'];
    const invalidInput = {};

    const valid = piped.decode(validInput.join(','));
    const invalid = piped.decode(invalidInput);

    expect(isRight(valid)).toBe(true);
    expect(getValueOrThrow(valid)).toEqual(validInput);

    expect(isLeft(invalid)).toBe(true);
  });
});
