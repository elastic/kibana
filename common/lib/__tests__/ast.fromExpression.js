import expect from 'expect.js';
import { fromExpression } from '../ast';

describe('ast fromExpression', () => {
  describe('single item expression', () => {
    it('is a chain', () => {
      const expression = 'whatever()';
      expect(fromExpression(expression)).to.have.property('chain');
    });

    describe('function without arguments', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'csv()';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('is a function ', () => {
        expect(block.type).to.equal('function');
      });

      it('is csv function', () => {
        expect(block.function).to.equal('csv');
      });

      it('has no arguments', () => {
        expect(block.arguments).to.eql({});
      });
    });

    describe('with string values', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'elasticsearch(index="logstash-*", oranges=bananas)';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('has arguemnts properties', () => {
        expect(block.arguments).not.to.eql({});
      });

      it('has index argument with string value', () => {
        expect(block.arguments).to.have.property('index');
        expect(block.arguments.index).to.eql([{
          type: 'string',
          value: 'logstash-*',
        }]);
      });

      it('has oranges argument with string value', () => {
        expect(block.arguments).to.have.property('oranges');
        expect(block.arguments.oranges).to.eql([{
          type: 'string',
          value: 'bananas',
        }]);
      });
    });

    describe('with function value', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'it(exampleFunction=someFunction(q="do something"))';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('is expression type', () => {
        expect(block.arguments).to.have.property('exampleFunction');
        expect(block.arguments.exampleFunction[0]).to.have.property('type', 'expression');
      });

      it('has expected shape', () => {
        expect(block.arguments.exampleFunction).to.eql([{
          type: 'expression',
          chain: [{
            type: 'function',
            function: 'someFunction',
            arguments: {
              q: [{
                type: 'string',
                value: 'do something',
              }],
            },
          }],
        }]);
      });
    });

    describe('with partial value', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'it(examplePartial=.somePartialFunction(q="do something"))';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('is partial type', () => {
        expect(block.arguments).to.have.property('examplePartial');
        expect(block.arguments.examplePartial[0]).to.have.property('type', 'partial');
      });

      it('has expected shape', () => {
        expect(block.arguments.examplePartial).to.eql([{
          type: 'partial',
          chain: [{
            type: 'function',
            function: 'somePartialFunction',
            arguments: {
              q: [{
                type: 'string',
                value: 'do something',
              }],
            },
          }],
        }]);
      });
    });
  });
});
