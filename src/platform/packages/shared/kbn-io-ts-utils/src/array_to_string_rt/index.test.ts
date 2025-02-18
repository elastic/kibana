/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as rt from 'io-ts';
import { arrayToStringRt } from '.';
import { isRight, Either, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

function getValueOrThrow(either: Either<unknown, any>) {
  return fold(() => {
    throw new Error('Cannot get right value of left');
  }, identity)(either);
}

describe('arrayToStringRt', () => {
  it('should validate strings', () => {
    expect(isRight(arrayToStringRt.decode(''))).toBe(true);
    expect(isRight(arrayToStringRt.decode('message'))).toBe(true);
    expect(isRight(arrayToStringRt.decode('message,event.original'))).toBe(true);
    expect(isRight(arrayToStringRt.decode({}))).toBe(false);
    expect(isRight(arrayToStringRt.decode(true))).toBe(false);
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

    expect(isRight(invalid)).toBe(false);
  });
});
