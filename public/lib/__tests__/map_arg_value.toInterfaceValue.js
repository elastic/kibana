import expect from 'expect.js';
import { toInterfaceValue } from '../map_arg_value';

function addFunctoin(arg) {
  if (Array.isArray(arg)) return arg.map(a => Object.assign({ function: null }, a));
  return Object.assign({ function: null }, arg);
}

describe('mapArgValue.toInterfaceValue', () => {
  describe('multivalue string arguments', () => {
    let argVals;

    beforeEach(() => {
      argVals = [{
        type: 'string',
        value: 'hello',
      }, {
        type: 'string',
        value: 'world',
      }];
    });
    it('maps into a single value, using the last one provided', () => {
      expect(toInterfaceValue(argVals)).to.eql(addFunctoin(argVals[1]));
    });

    it('leave multivalue string alone', () => {
      expect(toInterfaceValue(argVals, true)).to.eql(addFunctoin(argVals));
    });
  });

  describe('expressions', () => {
    it('turns "expression" chain into parsed expression string', () => {
      const argValue = [{
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
      }];

      expect(toInterfaceValue(argValue)).to.eql({
        type: 'expression',
        value: 'csv("stuff\nthings")',
        function: null,
      });
    });
  });

  describe('partial', () => {
    it('turns "partial" chain into parsed expression string', () => {
      const argValue = [{
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
      }];

      expect(toInterfaceValue(argValue)).to.eql({
        type: 'partial',
        value: '.partial("i am a partial")',
        function: null,
      });
    });
  });

  describe('simple math expressions', () => {
    let argValue;

    beforeEach(() => {
      argValue = [{
        type: 'string',
        value: 'median(cost)',
      }];
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
      argValue = [{
        type: 'string',
        value: 'median(cost + 100)',
      }];
    });

    it('is a math type', () => {
      expect(toInterfaceValue(argValue)).to.have.property('type', 'math');
    });

    it('does not extract the column or function', () => {
      expect(toInterfaceValue(argValue)).to.have.property('value', 'median(cost + 100)');
      expect(toInterfaceValue(argValue)).to.have.property('function', null);
    });
  });
});
