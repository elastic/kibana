/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromExpression } from '@kbn/interpreter';
import { getType } from '../get_type';

describe('fromExpression', () => {
  describe('invalid expression', () => {
    it('throws with invalid expression', () => {
      const check = () => fromExpression('wat!');
      expect(check).toThrowError(/Unable to parse expression/i);
    });
  });

  describe('zero-item expression', () => {
    it('yields a zero-length chain when empty', () => {
      const expression = '';
      const astObject = fromExpression(expression);
      expect(astObject).toHaveProperty('chain');
      expect(astObject.chain).toEqual([]);
    });
  });

  describe('single item expression', () => {
    it('is a chain', () => {
      const expression = 'whatever';
      expect(fromExpression(expression)).toHaveProperty('chain');
    });

    it('is a value', () => {
      const expression = '"hello"';
      expect(fromExpression(expression, 'argument')).toBe('hello');
    });

    describe('function without arguments', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'csv';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('is a function ', () => {
        expect(getType(block)).toBe('function');
      });

      it('is csv function', () => {
        expect(block.function).toBe('csv');
      });

      it('has no arguments', () => {
        expect(block.arguments).toEqual({});
      });
    });

    describe('with string values', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'elasticsearch index="logstash-*" oranges=bananas';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('has arguemnts properties', () => {
        expect(block.arguments).not.toEqual({});
      });

      it('has index argument with string value', () => {
        expect(block.arguments).toHaveProperty('index');
        expect(block.arguments.index).toEqual(['logstash-*']);
      });

      it('has oranges argument with string value', () => {
        expect(block.arguments).toHaveProperty('oranges');
        expect(block.arguments.oranges).toEqual(['bananas']);
      });
    });

    describe('with function value', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'it exampleFunction={someFunction q="do something"}';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('is expression type', () => {
        expect(block.arguments).toHaveProperty('exampleFunction');
        expect(block.arguments.exampleFunction[0]).toHaveProperty('type');
      });

      it('has expected shape', () => {
        expect(block.arguments.exampleFunction).toEqual([
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'someFunction',
                arguments: {
                  q: ['do something'],
                },
              },
            ],
          },
        ]);
      });
    });

    describe('with partial value', () => {
      let expression;
      let astObject;
      let block;

      beforeEach(() => {
        expression = 'it examplePartial=${somePartialFunction q="do something"}';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('is expression type', () => {
        expect(block.arguments).toHaveProperty('examplePartial');
        expect(block.arguments.examplePartial[0]).toHaveProperty('type');
      });

      it('has expected shape', () => {
        expect(block.arguments.examplePartial).toEqual([
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'somePartialFunction',
                arguments: {
                  q: ['do something'],
                },
              },
            ],
          },
        ]);
      });
    });
  });
});
