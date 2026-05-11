/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { captureBodyRt } from './capture_body_rt';
import { isRight } from 'fp-ts/Either';

describe('captureBodyRt', () => {
  describe('it should not accept', () => {
    [undefined, null, '', 0, 'foo', true, false].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(captureBodyRt.decode(input))).toBe(false);
      });
    });
  });

  describe('it should accept', () => {
    ['off', 'errors', 'transactions', 'all'].map((input) => {
      it(`${JSON.stringify(input)}`, () => {
        expect(isRight(captureBodyRt.decode(input))).toBe(true);
      });
    });
  });
});
