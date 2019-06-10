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

import { toExpression } from './ast';

describe('ast toExpression', () => {
  describe('single expression', () => {
    it('throws if no type included', () => {
      const errMsg = 'Objects must have a type property';
      const astObject = { hello: 'world' };
      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('throws if not correct type', () => {
      const errMsg = 'Expression must be an expression or argument function';
      const astObject = {
        type: 'hi',
        hello: 'world',
      };
      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('throws if expression without chain', () => {
      const errMsg = 'Expressions must contain a chain';
      const astObject = {
        type: 'expression',
        hello: 'world',
      };
      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('throws if arguments type is invalid', () => {
      const errMsg = 'Arguments can only be an object';
      const invalidTypes = [null, []];

      function validate(obj) {
        expect(() => toExpression(obj)).toThrowError(errMsg);
      }

      for (let i = 0; i < invalidTypes.length; i++) {
        const astObject = {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'test',
              arguments: invalidTypes[i],
            },
          ],
        };

        // eslint-disable-next-line no-loop-func
        validate(astObject);
      }
    });

    it('throws if function arguments type is invalid', () => {
      const errMsg = 'Arguments can only be an object';
      const astObject = {
        type: 'function',
        function: 'pointseries',
        arguments: null,
      };
      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('throws on invalid argument type', () => {
      const argType = '__invalid__wat__';
      const errMsg = `Invalid argument type in AST: ${argType}`;
      const astObject = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'test',
            arguments: {
              test: [
                {
                  type: argType,
                  value: 'invalid type',
                },
              ],
            },
          },
        ],
      };

      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('throws on expressions without chains', () => {
      const errMsg = 'Expressions must contain a chain';

      const astObject = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'test',
            arguments: {
              test: [
                {
                  type: 'expression',
                  invalid: 'no chain here',
                },
              ],
            },
          },
        ],
      };

      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('throws on nameless functions and partials', () => {
      const errMsg = 'Functions must have a function name';

      const astObject = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: '',
          },
        ],
      };

      expect(() => toExpression(astObject)).toThrowError(errMsg);
    });

    it('single expression', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {},
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv');
    });

    it('single expression with string argument', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: ['stuff\nthings'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv input="stuff\nthings"');
    });

    it('single expression string value with a backslash', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: ['slash \\\\ slash'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv input="slash \\\\\\\\ slash"');
    });

    it('single expression string value with a double quote', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: ['stuff\nthings\n"such"'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv input="stuff\nthings\n\\"such\\""');
    });

    it('single expression with number argument', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'series',
            arguments: {
              input: [1234],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('series input=1234');
    });

    it('single expression with boolean argument', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'series',
            arguments: {
              input: [true],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('series input=true');
    });

    it('single expression with null argument', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'series',
            arguments: {
              input: [null],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('series input=null');
    });

    it('single expression with multiple arguments', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: ['stuff\nthings'],
              separator: ['\\n'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv input="stuff\nthings" separator="\\\\n"');
    });

    it('single expression with multiple and repeated arguments', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: ['stuff\nthings', 'more,things\nmore,stuff'],
              separator: ['\\n'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe(
        'csv input="stuff\nthings" input="more,things\nmore,stuff" separator="\\\\n"'
      );
    });

    it('single expression with `getcalc` expression argument', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              calc: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'getcalc',
                      arguments: {},
                    },
                  ],
                },
              ],
              input: ['stuff\nthings'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv calc={getcalc} input="stuff\nthings"');
    });

    it('single expression with `partcalc` expression argument', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              calc: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'partcalc',
                      arguments: {},
                    },
                  ],
                },
              ],
              input: ['stuff\nthings'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('csv calc={partcalc} input="stuff\nthings"');
    });

    it('single expression with expression arguments, with arguments', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              sep: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'partcalc',
                      arguments: {
                        type: ['comma'],
                      },
                    },
                  ],
                },
              ],
              input: ['stuff\nthings'],
              break: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'setBreak',
                      arguments: {
                        type: ['newline'],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe(
        'csv sep={partcalc type="comma"} input="stuff\nthings" break={setBreak type="newline"}'
      );
    });
  });

  describe('multiple expressions', () => {
    it('two chained expressions', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: [
                'year,make,model,price\n2016,honda,cr-v,23845\n2016,honda,fit,15890,\n2016,honda,civic,18640',
              ],
            },
          },
          {
            type: 'function',
            function: 'line',
            arguments: {
              x: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'distinct',
                      arguments: {
                        f: ['year'],
                      },
                    },
                  ],
                },
              ],
              y: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'sum',
                      arguments: {
                        f: ['price'],
                      },
                    },
                  ],
                },
              ],
              colors: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'distinct',
                      arguments: {
                        f: ['model'],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      const expected = [
        'csv \n  input="year,make,model,price',
        '2016,honda,cr-v,23845',
        '2016,honda,fit,15890,',
        '2016,honda,civic,18640"\n| line x={distinct f="year"} y={sum f="price"} colors={distinct f="model"}',
      ];
      expect(expression).toBe(expected.join('\n'));
    });

    it('three chained expressions', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'csv',
            arguments: {
              input: [
                'year,make,model,price\n2016,honda,cr-v,23845\n2016,honda,fit,15890,\n2016,honda,civic,18640',
              ],
            },
          },
          {
            type: 'function',
            function: 'pointseries',
            arguments: {
              x: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'distinct',
                      arguments: {
                        f: ['year'],
                      },
                    },
                  ],
                },
              ],
              y: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'sum',
                      arguments: {
                        f: ['price'],
                      },
                    },
                  ],
                },
              ],
              colors: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'distinct',
                      arguments: {
                        f: ['model'],
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            type: 'function',
            function: 'line',
            arguments: {
              pallette: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'getColorPallette',
                      arguments: {
                        name: ['elastic'],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      const expected = [
        'csv \n  input="year,make,model,price',
        '2016,honda,cr-v,23845',
        '2016,honda,fit,15890,',
        '2016,honda,civic,18640"\n| pointseries x={distinct f="year"} y={sum f="price"} ' +
          'colors={distinct f="model"}\n| line pallette={getColorPallette name="elastic"}',
      ];
      expect(expression).toBe(expected.join('\n'));
    });
  });

  describe('unnamed arguments', () => {
    it('only unnamed', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'list',
            arguments: {
              _: ['one', 'two', 'three'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('list "one" "two" "three"');
    });

    it('named and unnamed', () => {
      const astObj = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'both',
            arguments: {
              named: ['example'],
              another: ['item'],
              _: ['one', 'two', 'three'],
            },
          },
        ],
      };

      const expression = toExpression(astObj);
      expect(expression).toBe('both named="example" another="item" "one" "two" "three"');
    });
  });
});
