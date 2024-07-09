/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ensureDuration } from '.';

describe('duration', () => {
  describe('as string', () => {
    test('ensureDuration 30s', () => {
      expect(ensureDuration('30s').asMilliseconds()).toEqual(30000);
    });

    test('ensureDuration 1m30s', () => {
      expect(ensureDuration('1m30s').asMilliseconds()).toEqual(90000);
    });

    test('ensureDuration 1m30s70ms', () => {
      expect(ensureDuration('1m30s70ms').asMilliseconds()).toEqual(90070);
    });

    test('ensureDuration stringified number', () => {
      expect(ensureDuration('30000').asMilliseconds()).toEqual(30000);
    });

    test.each(['60s', '1m', '1m0s'])('ensureDuration 1 minute %s', (d) => {
      expect(ensureDuration(d).asMilliseconds()).toEqual(60000);
    });
  });
});
