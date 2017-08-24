import expect from 'expect.js';
import { toInterfaceAst } from '../map_arg_value';

describe('mapArgValue.toInterfaceAst', () => {
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

      expect(toInterfaceAst(argValue)).to.eql({
        type: 'expression',
        value: 'csv("stuff\nthings")',
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

      expect(toInterfaceAst(argValue)).to.eql({
        type: 'partial',
        value: '.partial("i am a partial")',
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
      expect(toInterfaceAst(argValue)).to.have.property('type', 'math');
    });

    it('extracts column and function', () => {
      expect(toInterfaceAst(argValue)).to.have.property('value', 'cost');
      expect(toInterfaceAst(argValue)).to.have.property('function', 'median');
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
      expect(toInterfaceAst(argValue)).to.have.property('type', 'math');
    });

    it('does not extract the column or function', () => {
      expect(toInterfaceAst(argValue)).to.have.property('value', 'median(cost + 100)');
      expect(toInterfaceAst(argValue)).to.have.property('function', null);
    });

    it('handles parens values', () => {
      const value = {
        type: 'string',
        value: '(testing)',
      };

      expect(toInterfaceAst(value)).to.eql({
        type: 'math',
        value: '(testing)',
        function: null,
      });
    });
  });
});
