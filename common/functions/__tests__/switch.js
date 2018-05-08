import expect from 'expect.js';
import { switchFn } from '../switch';
import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';

describe('switch', () => {
  const fn = functionWrapper(switchFn);
  const mockCases = [
    {
      type: 'case',
      matches: false,
      result: 1,
    },
    {
      type: 'case',
      matches: false,
      result: 2,
    },
    {
      type: 'case',
      matches: true,
      result: 3,
    },
    {
      type: 'case',
      matches: false,
      result: 4,
    },
    {
      type: 'case',
      matches: true,
      result: 5,
    },
  ];
  const nonMatchingCases = mockCases.filter(c => !c.matches);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('with no cases', () => {
      it('should return the context if no default is provided', () => {
        const context = 'foo';
        expect(fn(context, {})).to.be(context);
      });

      it('should return the default if provided', () => {
        const context = 'foo';
        const args = { default: 'bar' };
        expect(fn(context, args)).to.be(args.default);
      });
    });

    describe('with no matching cases', () => {
      it('should return the context if no default is provided', () => {
        const context = 'foo';
        const args = { _: nonMatchingCases };
        expect(fn(context, args)).to.be(context);
      });

      it('should return the default if provided', () => {
        const context = 'foo';
        const args = {
          _: nonMatchingCases,
          default: 'bar',
        };
        expect(fn(context, args)).to.be(args.default);
      });
    });

    describe('with matching cases', () => {
      it('should return the first match', () => {
        const context = 'foo';
        const args = { _: mockCases };
        const firstMatch = mockCases.find(c => c.matches);
        expect(fn(context, args)).to.be(firstMatch.result);
      });
    });
  });
});
