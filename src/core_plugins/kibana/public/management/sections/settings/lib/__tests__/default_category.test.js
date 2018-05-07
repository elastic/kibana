import expect from 'expect.js';
import { DEFAULT_CATEGORY } from '../default_category';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('DEFAULT_CATEGORY', function () {
      it('should be general', function () {
        expect(DEFAULT_CATEGORY).to.be('general');
      });
    });
  });
});
