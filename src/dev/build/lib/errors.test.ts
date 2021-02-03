/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isErrorLogged, markErrorLogged } from './errors';

describe('dev/build/lib/errors', () => {
  describe('isErrorLogged()/markErrorLogged()', () => {
    it('returns true if error has been passed to markErrorLogged()', () => {
      const error = new Error();
      expect(isErrorLogged(error)).toBe(false);
      markErrorLogged(error);
      expect(isErrorLogged(error)).toBe(true);
    });

    describe('isErrorLogged()', () => {
      it('handles any value type', () => {
        expect(isErrorLogged(null)).toBe(false);
        expect(isErrorLogged(undefined)).toBe(false);
        expect(isErrorLogged(1)).toBe(false);
        expect(isErrorLogged([])).toBe(false);
        expect(isErrorLogged({})).toBe(false);
        expect(isErrorLogged(/foo/)).toBe(false);
        expect(isErrorLogged(new Date())).toBe(false);
      });
    });
  });
});
