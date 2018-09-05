import expect from 'expect.js';
import { compare } from '../compare';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('compare', () => {
  const fn = functionWrapper(compare);

  describe('args', () => {
    describe('_', () => {
      it('sets the operator', () => {
        expect(fn(0, { _: 'lt', to: 1 })).to.be(true);
      });

      it("defaults to 'eq'", () => {
        expect(fn(0, { to: 1 })).to.be(false);
        expect(fn(0, { to: 0 })).to.be(true);
      });

      it('throws when invalid op is provided', () => {
        expect(() => fn(1, { _: 'boo', to: 2 })).to.throwException(e => {
          expect(e.message).to.be('Invalid compare operator. Use eq, ne, lt, gt, lte, or gte.');
        });
        expect(() => fn(1, { _: 'boo' })).to.throwException(e => {
          expect(e.message).to.be('Invalid compare operator. Use eq, ne, lt, gt, lte, or gte.');
        });
      });
    });

    describe('to', () => {
      it('sets the value that context is compared to', () => {
        expect(fn(0, { to: 1 })).to.be(false);
      });

      it('if not provided, ne returns true while every other operator returns false', () => {
        expect(fn(null, { _: 'ne' })).to.be(true);
        expect(fn(0, { _: 'ne' })).to.be(true);
        expect(fn(true, { _: 'lte' })).to.be(false);
        expect(fn(1, { _: 'gte' })).to.be(false);
        expect(fn('foo', { _: 'lt' })).to.be(false);
        expect(fn(null, { _: 'gt' })).to.be(false);
        expect(fn(null, { _: 'eq' })).to.be(false);
      });
    });
  });

  describe('same type comparisons', () => {
    describe('null', () => {
      it('returns true', () => {
        expect(fn(null, { _: 'eq', to: null })).to.be(true);
        expect(fn(null, { _: 'lte', to: null })).to.be(true);
        expect(fn(null, { _: 'gte', to: null })).to.be(true);
      });

      it('returns false', () => {
        expect(fn(null, { _: 'ne', to: null })).to.be(false);
        expect(fn(null, { _: 'lt', to: null })).to.be(false);
        expect(fn(null, { _: 'gt', to: null })).to.be(false);
      });
    });

    describe('number', () => {
      it('returns true', () => {
        expect(fn(-2.34, { _: 'lt', to: 10 })).to.be(true);
        expect(fn(2, { _: 'gte', to: 2 })).to.be(true);
      });

      it('returns false', () => {
        expect(fn(2, { _: 'eq', to: 10 })).to.be(false);
        expect(fn(10, { _: 'ne', to: 10 })).to.be(false);
        expect(fn(1, { _: 'lte', to: -3 })).to.be(false);
        expect(fn(2, { _: 'gt', to: 2 })).to.be(false);
      });
    });

    describe('string', () => {
      it('returns true', () => {
        expect(fn('foo', { _: 'gte', to: 'foo' })).to.be(true);
        expect(fn('foo', { _: 'lte', to: 'foo' })).to.be(true);
        expect(fn('bar', { _: 'lt', to: 'foo' })).to.be(true);
      });

      it('returns false', () => {
        expect(fn('foo', { _: 'eq', to: 'bar' })).to.be(false);
        expect(fn('foo', { _: 'ne', to: 'foo' })).to.be(false);
        expect(fn('foo', { _: 'gt', to: 'foo' })).to.be(false);
      });
    });

    describe('boolean', () => {
      it('returns true', () => {
        expect(fn(true, { _: 'eq', to: true })).to.be(true);
        expect(fn(false, { _: 'eq', to: false })).to.be(true);
        expect(fn(true, { _: 'ne', to: false })).to.be(true);
        expect(fn(false, { _: 'ne', to: true })).to.be(true);
      });
      it('returns false', () => {
        expect(fn(true, { _: 'eq', to: false })).to.be(false);
        expect(fn(false, { _: 'eq', to: true })).to.be(false);
        expect(fn(true, { _: 'ne', to: true })).to.be(false);
        expect(fn(false, { _: 'ne', to: false })).to.be(false);
      });
    });
  });

  describe('different type comparisons', () => {
    it("returns true for 'ne' only", () => {
      expect(fn(0, { _: 'ne', to: '0' })).to.be(true);
    });

    it('otherwise always returns false', () => {
      expect(fn(0, { _: 'eq', to: '0' })).to.be(false);
      expect(fn('foo', { _: 'lt', to: 10 })).to.be(false);
      expect(fn('foo', { _: 'lte', to: true })).to.be(false);
      expect(fn(0, { _: 'gte', to: null })).to.be(false);
      expect(fn(0, { _: 'eq', to: false })).to.be(false);
      expect(fn(true, { _: 'gte', to: null })).to.be(false);
    });
  });
});
