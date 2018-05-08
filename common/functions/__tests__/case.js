import expect from 'expect.js';
import { caseFn } from '../case';
import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';

describe('case', () => {
  const fn = functionWrapper(caseFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('no args', () => {
      it('should return a case object that matches with the result as the context', () => {
        const context = null;
        const args = {};
        expect(fn(context, args)).to.eql({
          type: 'case',
          matches: true,
          result: context,
        });
      });
    });

    describe('no if or value', () => {
      it('should return the result if provided', () => {
        const context = null;
        const args = {
          then: 'foo',
        };
        expect(fn(context, args)).to.eql({
          type: 'case',
          matches: true,
          result: args.then,
        });
      });
    });

    describe('with if', () => {
      it('should return as the matches prop', () => {
        const context = null;
        const args = { if: false };
        expect(fn(context, args)).to.eql({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });

    describe('with value', () => {
      it('should return whether it matches the context as the matches prop', () => {
        const args = {
          _: 'foo',
          then: 'bar',
        };
        expect(fn('foo', args)).to.eql({
          type: 'case',
          matches: true,
          result: args.then,
        });
        expect(fn('bar', args)).to.eql({
          type: 'case',
          matches: false,
          result: args.then,
        });
      });
    });

    describe('with if and value', () => {
      it('should return the if as the matches prop', () => {
        const context = null;
        const args = {
          _: 'foo',
          if: true,
        };
        expect(fn(context, args)).to.eql({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });
  });
});
