/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { datemathStringRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('datemathStringRt', () => {
  it('passes if it is a valid dateMath', () => {
    expect(isRight(datemathStringRt.decode('now'))).toBe(true);
  });

  it('fails if it is an invalid dateMath', () => {
    expect(isRight(datemathStringRt.decode('now-1l'))).toBe(false);
  });

  it('fails if it is a ISO date', () => {
    expect(isRight(datemathStringRt.decode('2019-02-30T11:18:31.407Z'))).toBe(false);
  });

  it('fails if it is a letter', () => {
    expect(isRight(datemathStringRt.decode('a'))).toBe(false);
  });
});
