import expect from 'expect.js';
import { toAstValue } from '../map_arg_value';

describe('mapArgValue.toAstValue', () => {
  describe('expressions and partials', () => {
    it('returns the "expression" value as the ast', () => {
      const argValue = {
        type: 'expression',
        value: 'csv("stuff\nthings")',
        function: null,
      };

      expect(toAstValue(argValue)).to.eql({
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
      });
    });

    it('returns the "partial" value as the ast', () => {
      const argValue = {
        type: 'expression',
        value: '.partial("i am a partial")',
        function: null,
      };

      expect(toAstValue(argValue)).to.eql({
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
      });
    });

    it('returns array of values with asts', () => {
      const argValue = [{
        type: 'expression',
        value: 'csv("stuff\nthings")',
        function: null,
      }, {
        type: 'expression',
        value: '.partial("i am a partial")',
        function: null,
      }];

      expect(toAstValue(argValue)).to.eql([{
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
      }, {
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
      }]);
    });
  });

  describe('math expressions', () => {
    it('turns simple math into a string', () => {
      const argValue = {
        type: 'math',
        value: 'cost',
        function: 'median',
      };

      expect(toAstValue(argValue)).to.eql({
        type: 'string',
        value: 'median(cost)',
        function: null,
      });
    });

    it('turns complex math into a string', () => {
      const argValue = {
        type: 'math',
        value: 'sum(cost + 100)',
        function: null,
      };

      expect(toAstValue(argValue)).to.eql({
        type: 'string',
        value: 'sum(cost + 100)',
        function: null,
      });
    });

    it('turns simple and complex math strings from array', () => {
      const argValue = [{
        type: 'math',
        value: 'cost',
        function: 'median',
      }, {
        type: 'math',
        value: 'percent(cost) * 100',
        function: null,
      }];

      expect(toAstValue(argValue)).to.eql([{
        type: 'string',
        value: 'median(cost)',
        function: null,
      }, {
        type: 'string',
        value: 'percent(cost) * 100',
        function: null,
      }]);
    });
  });
});
