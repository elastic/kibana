import expect from 'expect.js';
import { ifFn } from '../if';
import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';

describe('if', () => {
  const fn = functionWrapper(ifFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', () => {
        expect(fn(null, { _: true, then: 'foo' })).to.be('foo');
        expect(fn(null, { _: true, then: 'foo', else: 'bar' })).to.be('foo');
      });

      it('without then', () => {
        expect(fn(null, { _: true })).to.be(null);
        expect(fn('some context', { _: true })).to.be('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', () =>
        expect(fn('some context', { _: false, then: 'foo', else: 'bar' })).to.be('bar'));

      it('without else', () =>
        expect(fn('some context', { _: false, then: 'foo' })).to.be('some context'));
    });
  });

  // TODO: Passing through context
});
