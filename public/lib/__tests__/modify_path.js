import expect from 'expect.js';
import { prepend, append } from '../modify_path';

describe('modify paths', () => {
  describe('prepend', () => {
    it('prepends a string path', () => {
      expect(prepend('a.b.c', '0')).to.eql([0, 'a', 'b', 'c']);
    });

    it('prepends an array path', () => {
      expect(prepend(['a', 1, 'last'], '0')).to.eql([0, 'a', 1, 'last']);
    });
  });

  describe('append', () => {
    it('appends to a string path', () => {
      expect(append('one.2.3', 'zero')).to.eql(['one', 2, 3, 'zero']);
    });

    it('appends to an array path', () => {
      expect(append('testString', 'huzzah')).to.eql(['testString', 'huzzah']);
    });
  });
});
