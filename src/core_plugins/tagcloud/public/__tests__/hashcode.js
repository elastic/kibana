import { hashCode } from '../hashcode';
import expect from 'expect.js';


describe('TagCloud - hashcode tests', function () {

  [
    'foo',
    'bar',
    `Lorem ipsum dolor sit amet,
     consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
     quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit 
     in voluptate velit esse cillum doloreeu fugiat nulla pariatur.
     Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    'LöÖÐþúÚ'//non-ascii
  ].forEach((testString) => {

    //implement before running in CI
    return;

    it(`${testString} should hash to number`, () => {
      const hashcode = hashCode(testString);
      expect(typeof hashcode).to.equal('number');
      expect(isNaN(hashcode)).to.equal(false);
    });

    it (`${testString} should hash to 32 bit range`, () => {
      const hashcode = hashCode(testString);
      const upper = Math.pow(2, 31) - 1;
      expect(hashcode >= 0 && hashcode <= upper).to.equal(true);
    });

    it(`should be deterministic for ${testString}`, () => {
      const hashcode1 = hashCode(testString);
      const hashcode2 = hashCode(testString);
      expect(hashcode1).to.equal(hashcode2);
    });

  });

});
