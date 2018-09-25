/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';
import { fromExpression } from '../ast';
import { getType } from '../get_type';

describe('ast fromExpression', () => {
  describe('invalid expression', () => {
    it('throws when empty', () => {
      const check = () => fromExpression('');
      expect(check).to.throwException(/Unable to parse expression/i);
    });

    it('throws with invalid expression', () => {
      const check = () => fromExpression('wat!');
      expect(check).to.throwException(/Unable to parse expression/i);
    });
  });

  describe('single item expression', () => {
    it('is a chain', () => {
      const expression = 'whatever';
      expect(fromExpression(expression)).to.have.property('chain');
    });

    it('is a value', () => {
      const expression = '"hello"';
      expect(fromExpression(expression, 'argument')).to.equal('hello');
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
        expect(getType(block)).to.equal('function');
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
        expression = 'elasticsearch index="logstash-*" oranges=bananas';
        astObject = fromExpression(expression);
        block = astObject.chain[0];
      });

      it('has arguemnts properties', () => {
        expect(block.arguments).not.to.eql({});
      });

      it('has index argument with string value', () => {
        expect(block.arguments).to.have.property('index');
        expect(block.arguments.index).to.eql(['logstash-*']);
      });

      it('has oranges argument with string value', () => {
        expect(block.arguments).to.have.property('oranges');
        expect(block.arguments.oranges).to.eql(['bananas']);
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
        expect(block.arguments).to.have.property('exampleFunction');
        expect(block.arguments.exampleFunction[0]).to.have.property('type', 'expression');
      });

      it('has expected shape', () => {
        expect(block.arguments.exampleFunction).to.eql([
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
        expect(block.arguments).to.have.property('examplePartial');
        expect(block.arguments.examplePartial[0]).to.have.property('type', 'expression');
      });

      it('has expected shape', () => {
        expect(block.arguments.examplePartial).to.eql([
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
