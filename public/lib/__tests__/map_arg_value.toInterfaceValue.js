import expect from 'expect.js';
import { toInterfaceValue } from '../map_arg_value';

describe('mapArgValue.toInterfaceValue', () => {
  describe('expressions', () => {
    it('turns "expression" chain into parsed expression string', () => {
      const argValue = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            _: [{
              type: 'string',
              value: 'stuff\nthings',
            }],
          },
        }],
      };

      expect(toInterfaceValue(argValue)).to.eql({
        type: 'expression',
        value: 'csv "stuff\nthings"',
        function: null,
        chain: argValue.chain,
      });
    });
  });

  describe('partial', () => {
    it('turns "partial" chain into parsed expression string', () => {
      const argValue = {
        type: 'partial',
        chain: [{
          type: 'function',
          function: 'partial',
          arguments: {
            _: [{
              type: 'string',
              value: 'i am a partial',
            }],
          },
        }],
      };

      expect(toInterfaceValue(argValue)).to.eql({
        type: 'partial',
        value: 'partial "i am a partial"',
        function: null,
        chain: argValue.chain,
      });
    });
  });

  describe('simple math expressions', () => {
    let argValue;

    beforeEach(() => {
      argValue = {
        type: 'string',
        value: 'median(cost)',
      };
    });

    it('is a math type', () => {
      expect(toInterfaceValue(argValue)).to.have.property('type', 'math');
    });

    it('extracts column and function', () => {
      expect(toInterfaceValue(argValue)).to.have.property('value', 'cost');
      expect(toInterfaceValue(argValue)).to.have.property('function', 'median');
    });
  });

  describe('complex math expressions', () => {
    let argValue;

    beforeEach(() => {
      argValue = {
        type: 'string',
        value: 'median(cost + 100)',
      };
    });

    it('is a math type', () => {
      expect(toInterfaceValue(argValue)).to.have.property('type', 'math');
    });

    it('does not extract the column or function', () => {
      expect(toInterfaceValue(argValue)).to.have.property('value', 'median(cost + 100)');
      expect(toInterfaceValue(argValue)).to.have.property('function', null);
    });

    it('handles parens values', () => {
      const value = {
        type: 'string',
        value: '(testing)',
      };

      expect(toInterfaceValue(value)).to.eql({
        type: 'math',
        value: '(testing)',
        function: null,
      });
    });
  });
});
