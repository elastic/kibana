import expect from 'expect.js';
import { math } from '../math.js';

describe('math', () => {
  describe('spec', () => {
    it('is a function', () => {
      expect(math).to.be.a('function');
    });
  });

  describe('function', () => {
    let fn;
    beforeEach(() => {
      fn = math().fn;
    });

    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });
});
