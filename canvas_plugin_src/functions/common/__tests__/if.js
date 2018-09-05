import expect from 'expect.js';
import { ifFn } from '../if';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('if', () => {
  const fn = functionWrapper(ifFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', async () => {
        expect(await fn(null, { _: true, then: () => 'foo' })).to.be('foo');
        expect(await fn(null, { _: true, then: () => 'foo', else: () => 'bar' })).to.be('foo');
      });

      it('without then', async () => {
        expect(await fn(null, { _: true })).to.be(null);
        expect(await fn('some context', { _: true })).to.be('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', async () =>
        expect(await fn('some context', { _: false, then: () => 'foo', else: () => 'bar' })).to.be(
          'bar'
        ));

      it('without else', async () =>
        expect(await fn('some context', { _: false, then: () => 'foo' })).to.be('some context'));
    });

    describe('falsy values', () => {
      describe('for then', () => {
        it('with null', async () =>
          expect(await fn('some context', { _: true, then: () => null })).to.be(null));

        it('with false', async () =>
          expect(await fn('some context', { _: true, then: () => false })).to.be(false));

        it('with 0', async () =>
          expect(await fn('some context', { _: true, then: () => 0 })).to.be(0));
      });

      describe('for else', () => {
        it('with null', async () =>
          expect(await fn('some context', { _: false, else: () => null })).to.be(null));

        it('with false', async () =>
          expect(await fn('some context', { _: false, else: () => false })).to.be(false));

        it('with 0', async () =>
          expect(await fn('some context', { _: false, else: () => 0 })).to.be(0));
      });
    });
  });

  // TODO: Passing through context
});
