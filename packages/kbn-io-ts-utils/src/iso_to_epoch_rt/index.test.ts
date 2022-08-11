/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isoToEpochRt } from '.';
import { isRight } from 'fp-ts/lib/Either';

describe('isoToEpochRt', () => {
  it('validates whether its input is a valid ISO timestamp', () => {
    expect(isRight(isoToEpochRt.decode(1566299881499))).toBe(false);

    expect(isRight(isoToEpochRt.decode('2019-08-20T11:18:31.407Z'))).toBe(true);
  });

  it('decodes valid ISO timestamps to epoch time', () => {
    const iso = '2019-08-20T11:18:31.407Z';
    const result = isoToEpochRt.decode(iso);

    if (isRight(result)) {
      expect(result.right).toBe(new Date(iso).getTime());
    } else {
      fail();
    }
  });

  it('encodes epoch time to ISO string', () => {
    expect(isoToEpochRt.encode(1566299911407)).toBe('2019-08-20T11:18:31.407Z');
  });
});
