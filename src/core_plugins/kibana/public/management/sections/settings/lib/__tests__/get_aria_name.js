
import { getAriaName } from '../get_aria_name';
import expect from 'expect.js';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getAriaName(name)', function () {
      it('should be a function', function () {
        expect(getAriaName).to.be.a(Function);
      });

      it('should return a space delimited lower-case string with no special characters', function () {
        expect(getAriaName('xPack:defaultAdminEmail')).to.be('x pack default admin email');
        expect(getAriaName('doc_table:highlight')).to.be('doc table highlight');
        expect(getAriaName('foo')).to.be('foo');
      });

      it('should return an empty string if passed undefined or null', function () {
        expect(getAriaName()).to.be('');
        expect(getAriaName(undefined)).to.be('');
        expect(getAriaName(null)).to.be('');
      });
    });
  });
});
