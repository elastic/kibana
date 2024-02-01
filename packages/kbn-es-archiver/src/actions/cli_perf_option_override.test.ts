/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseNumberFlag } from './cli_perf_option_override';

describe('esArchiver: cli perf option override', () => {
  describe(`parseNumberFlag()`, () => {
    it(`should return undefined if the flag is not provided`, () => {
      const actual = parseNumberFlag('');
      expect(actual).toBeUndefined();
    });
    it(`should throw if the flag cannot be parsed into a number`, () => {
      const throws = () => parseNumberFlag('adfabas');
      expect(throws).toThrow();
    });
    it(`should return a number if the flag can be parsed`, () => {
      expect(parseNumberFlag('3')).toBe(3);
    });
  });
});
