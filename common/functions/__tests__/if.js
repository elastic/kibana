import expect from 'expect.js';
import { ifFn } from '../if.js';

describe('if', () => {
  const fn = ifFn().fn;
  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', () => {
        expect(fn(null, { _: true, then: 'foo' })).to.be.equal('foo');
        expect(fn(null, { _: true, then: 'foo', else: 'bar' })).to.be.equal('foo');
      });

      it('without then', () => {
        expect(fn(null, { _: true })).to.be.equal(null);
        expect(fn('some context', { _: true })).to.be.equal('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', () =>
        expect(fn('some context', { _: false, then: 'foo', else: 'bar' })).to.be.equal('bar'));

      it('without else', () =>
        expect(fn('some context', { _: false, then: 'foo' })).to.be.equal('some context'));
    });
  });

  // TODO: Passing through context
});
