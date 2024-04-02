/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isoToEpochSecsRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('isoToEpochSecsRt', () => {
  it('validates whether its input is a valid ISO timestamp', () => {
    expect(isRight(isoToEpochSecsRt.decode(1566299881499))).toBe(false);

    expect(isRight(isoToEpochSecsRt.decode('2019-08-20T11:18:31.407Z'))).toBe(true);
  });

  it('decodes valid ISO timestamps to epoch secs time', () => {
    const iso = '2019-08-20T11:18:31.407Z';
    const result = isoToEpochSecsRt.decode(iso);

    if (isRight(result)) {
      expect(result.right).toBe(new Date(iso).getTime() / 1000);
    } else {
      fail();
    }
  });

  it('encodes epoch secs time to ISO string', () => {
    expect(isoToEpochSecsRt.encode(1566299911407)).toBe('2019-08-20T11:18:31.407Z');
  });
});
