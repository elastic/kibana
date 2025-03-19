/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'crypto';
import { getNextAttemptDate } from './get_next_attempt_date';

describe('getNextAttemptDate', () => {
  // The casting is needed because `randomInt` has multiple call signatures and typescript is taking the callback one.
  const randomIntSpy = jest.spyOn(crypto, 'randomInt') as unknown as jest.SpyInstance<
    number,
    [min: number, max: number]
  >;

  afterEach(() => {
    randomIntSpy.mockReset();
  });

  test('returns the date + 24h + random seed (2 minutes)', () => {
    randomIntSpy.mockReturnValue(120);

    expect(getNextAttemptDate(new Date('2022-10-27T12:00:00Z').getTime())).toStrictEqual(
      new Date('2022-10-28T12:02:00Z')
    );
  });

  test('returns the start of the next day if the random addition stays in the same day', () => {
    randomIntSpy.mockReturnValue(120);
    randomIntSpy.mockReturnValueOnce(-120);
    expect(getNextAttemptDate(new Date('2022-10-27T00:01:00Z').getTime())).toStrictEqual(
      new Date('2022-10-28T00:03:00Z')
    );
    expect(randomIntSpy).toHaveBeenCalledTimes(2);
  });

  test('returns the end of the next day minus 1 minute if the random addition goes to the following day', () => {
    randomIntSpy.mockReturnValue(-120);
    randomIntSpy.mockReturnValueOnce(120);
    expect(getNextAttemptDate(new Date('2022-10-27T23:58:30Z').getTime())).toStrictEqual(
      new Date('2022-10-28T23:56:30Z')
    );
    expect(randomIntSpy).toHaveBeenCalledTimes(2);
  });
});
