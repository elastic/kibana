import expect from 'expect.js';

import { isOSS } from '../is_oss';

describe('is_oss', () => {
  describe('x-pack installed', () => {
    it('should return false', () => {
      expect(isOSS()).to.be(false);
    });
  });
});
