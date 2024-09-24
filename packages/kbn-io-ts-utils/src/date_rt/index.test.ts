/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dateRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('dateRt', () => {
  it('passes if it is a valid date/time', () => {
    expect(isRight(dateRt.decode('2019-08-20T11:18:31.407Z'))).toBe(true);
  });

  it('passes if it is a valid date', () => {
    expect(isRight(dateRt.decode('2019-08-20'))).toBe(true);
  });

  it('fails if it is an invalid date/time', () => {
    expect(isRight(dateRt.decode('2019-02-30T11:18:31.407Z'))).toBe(false);
  });
});
