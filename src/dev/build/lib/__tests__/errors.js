import expect from 'expect.js';

import { isErrorLogged, markErrorLogged } from '../errors';

describe('dev/build/lib/errors', () => {
  describe('isErrorLogged()/markErrorLogged()', () => {
    it('returns true if error has been passed to markErrorLogged()', () => {
      const error = new Error();
      expect(isErrorLogged(error)).to.be(false);
      markErrorLogged(error);
      expect(isErrorLogged(error)).to.be(true);
    });

    describe('isErrorLogged()', () => {
      it('handles any value type', () => {
        expect(isErrorLogged(null)).to.be(false);
        expect(isErrorLogged(undefined)).to.be(false);
        expect(isErrorLogged(1)).to.be(false);
        expect(isErrorLogged([])).to.be(false);
        expect(isErrorLogged({})).to.be(false);
        expect(isErrorLogged(/foo/)).to.be(false);
        expect(isErrorLogged(new Date())).to.be(false);
      });
    });
  });
});
