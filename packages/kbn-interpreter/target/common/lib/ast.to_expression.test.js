"use strict";

var _ast = require("./ast");

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
describe('ast toExpression', function () {
  describe('single expression', function () {
    it('throws if no type included', function () {
      var errMsg = 'Objects must have a type property';
      var astObject = {
        hello: 'world'
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('throws if not correct type', function () {
      var errMsg = 'Expression must be an expression or argument function';
      var astObject = {
        type: 'hi',
        hello: 'world'
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('throws if expression without chain', function () {
      var errMsg = 'Expressions must contain a chain';
      var astObject = {
        type: 'expression',
        hello: 'world'
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('throws if arguments type is invalid', function () {
      var errMsg = 'Arguments can only be an object';
      var invalidTypes = [null, []];

      function validate(obj) {
        expect(function () {
          return (0, _ast.toExpression)(obj);
        }).toThrowError(errMsg);
      }

      for (var i = 0; i < invalidTypes.length; i++) {
        var astObject = {
          type: 'expression',
          chain: [{
            type: 'function',
            function: 'test',
            arguments: invalidTypes[i]
          }]
        }; // eslint-disable-next-line no-loop-func

        validate(astObject);
      }
    });
    it('throws if function arguments type is invalid', function () {
      var errMsg = 'Arguments can only be an object';
      var astObject = {
        type: 'function',
        function: 'pointseries',
        arguments: null
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('throws on invalid argument type', function () {
      var argType = '__invalid__wat__';
      var errMsg = "Invalid argument type in AST: ".concat(argType);
      var astObject = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'test',
          arguments: {
            test: [{
              type: argType,
              value: 'invalid type'
            }]
          }
        }]
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('throws on expressions without chains', function () {
      var errMsg = 'Expressions must contain a chain';
      var astObject = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'test',
          arguments: {
            test: [{
              type: 'expression',
              invalid: 'no chain here'
            }]
          }
        }]
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('throws on nameless functions and partials', function () {
      var errMsg = 'Functions must have a function name';
      var astObject = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: ''
        }]
      };
      expect(function () {
        return (0, _ast.toExpression)(astObject);
      }).toThrowError(errMsg);
    });
    it('single expression', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {}
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv');
    });
    it('single expression with string argument', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['stuff\nthings']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv input="stuff\nthings"');
    });
    it('single expression string value with a backslash', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['slash \\\\ slash']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv input="slash \\\\\\\\ slash"');
    });
    it('single expression string value with a double quote', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['stuff\nthings\n"such"']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv input="stuff\nthings\n\\"such\\""');
    });
    it('single expression with number argument', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'series',
          arguments: {
            input: [1234]
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('series input=1234');
    });
    it('single expression with boolean argument', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'series',
          arguments: {
            input: [true]
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('series input=true');
    });
    it('single expression with null argument', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'series',
          arguments: {
            input: [null]
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('series input=null');
    });
    it('single expression with multiple arguments', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['stuff\nthings'],
            separator: ['\\n']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv input="stuff\nthings" separator="\\\\n"');
    });
    it('single expression with multiple and repeated arguments', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['stuff\nthings', 'more,things\nmore,stuff'],
            separator: ['\\n']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv input="stuff\nthings" input="more,things\nmore,stuff" separator="\\\\n"');
    });
    it('single expression with `getcalc` expression argument', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            calc: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'getcalc',
                arguments: {}
              }]
            }],
            input: ['stuff\nthings']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv calc={getcalc} input="stuff\nthings"');
    });
    it('single expression with `partcalc` expression argument', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            calc: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'partcalc',
                arguments: {}
              }]
            }],
            input: ['stuff\nthings']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv calc={partcalc} input="stuff\nthings"');
    });
    it('single expression with expression arguments, with arguments', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            sep: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'partcalc',
                arguments: {
                  type: ['comma']
                }
              }]
            }],
            input: ['stuff\nthings'],
            break: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'setBreak',
                arguments: {
                  type: ['newline']
                }
              }]
            }]
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('csv sep={partcalc type="comma"} input="stuff\nthings" break={setBreak type="newline"}');
    });
  });
  describe('multiple expressions', function () {
    it('two chained expressions', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['year,make,model,price\n2016,honda,cr-v,23845\n2016,honda,fit,15890,\n2016,honda,civic,18640']
          }
        }, {
          type: 'function',
          function: 'line',
          arguments: {
            x: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: ['year']
                }
              }]
            }],
            y: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'sum',
                arguments: {
                  f: ['price']
                }
              }]
            }],
            colors: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: ['model']
                }
              }]
            }]
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      var expected = ['csv \n  input="year,make,model,price', '2016,honda,cr-v,23845', '2016,honda,fit,15890,', '2016,honda,civic,18640"\n| line x={distinct f="year"} y={sum f="price"} colors={distinct f="model"}'];
      expect(expression).toBe(expected.join('\n'));
    });
    it('three chained expressions', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: ['year,make,model,price\n2016,honda,cr-v,23845\n2016,honda,fit,15890,\n2016,honda,civic,18640']
          }
        }, {
          type: 'function',
          function: 'pointseries',
          arguments: {
            x: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: ['year']
                }
              }]
            }],
            y: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'sum',
                arguments: {
                  f: ['price']
                }
              }]
            }],
            colors: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: ['model']
                }
              }]
            }]
          }
        }, {
          type: 'function',
          function: 'line',
          arguments: {
            pallette: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'getColorPallette',
                arguments: {
                  name: ['elastic']
                }
              }]
            }]
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      var expected = ['csv \n  input="year,make,model,price', '2016,honda,cr-v,23845', '2016,honda,fit,15890,', '2016,honda,civic,18640"\n| pointseries x={distinct f="year"} y={sum f="price"} ' + 'colors={distinct f="model"}\n| line pallette={getColorPallette name="elastic"}'];
      expect(expression).toBe(expected.join('\n'));
    });
  });
  describe('unnamed arguments', function () {
    it('only unnamed', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'list',
          arguments: {
            _: ['one', 'two', 'three']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('list "one" "two" "three"');
    });
    it('named and unnamed', function () {
      var astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'both',
          arguments: {
            named: ['example'],
            another: ['item'],
            _: ['one', 'two', 'three']
          }
        }]
      };
      var expression = (0, _ast.toExpression)(astObj);
      expect(expression).toBe('both named="example" another="item" "one" "two" "three"');
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL2FzdC50b19leHByZXNzaW9uLnRlc3QuanMiXSwibmFtZXMiOlsiZGVzY3JpYmUiLCJpdCIsImVyck1zZyIsImFzdE9iamVjdCIsImhlbGxvIiwiZXhwZWN0IiwidG9UaHJvd0Vycm9yIiwidHlwZSIsImludmFsaWRUeXBlcyIsInZhbGlkYXRlIiwib2JqIiwiaSIsImxlbmd0aCIsImNoYWluIiwiZnVuY3Rpb24iLCJhcmd1bWVudHMiLCJhcmdUeXBlIiwidGVzdCIsInZhbHVlIiwiaW52YWxpZCIsImFzdE9iaiIsImV4cHJlc3Npb24iLCJ0b0JlIiwiaW5wdXQiLCJzZXBhcmF0b3IiLCJjYWxjIiwic2VwIiwiYnJlYWsiLCJ4IiwiZiIsInkiLCJjb2xvcnMiLCJleHBlY3RlZCIsImpvaW4iLCJwYWxsZXR0ZSIsIm5hbWUiLCJfIiwibmFtZWQiLCJhbm90aGVyIl0sIm1hcHBpbmdzIjoiOztBQW1CQTs7QUFuQkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXFCQUEsUUFBUSxDQUFDLGtCQUFELEVBQXFCLFlBQU07QUFDakNBLEVBQUFBLFFBQVEsQ0FBQyxtQkFBRCxFQUFzQixZQUFNO0FBQ2xDQyxJQUFBQSxFQUFFLENBQUMsNEJBQUQsRUFBK0IsWUFBTTtBQUNyQyxVQUFNQyxNQUFNLEdBQUcsbUNBQWY7QUFDQSxVQUFNQyxTQUFTLEdBQUc7QUFBRUMsUUFBQUEsS0FBSyxFQUFFO0FBQVQsT0FBbEI7QUFDQUMsTUFBQUEsTUFBTSxDQUFDO0FBQUEsZUFBTSx1QkFBYUYsU0FBYixDQUFOO0FBQUEsT0FBRCxDQUFOLENBQXNDRyxZQUF0QyxDQUFtREosTUFBbkQ7QUFDRCxLQUpDLENBQUY7QUFNQUQsSUFBQUEsRUFBRSxDQUFDLDRCQUFELEVBQStCLFlBQU07QUFDckMsVUFBTUMsTUFBTSxHQUFHLHVEQUFmO0FBQ0EsVUFBTUMsU0FBUyxHQUFHO0FBQ2hCSSxRQUFBQSxJQUFJLEVBQUUsSUFEVTtBQUVoQkgsUUFBQUEsS0FB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QUUsVUFEUjtBQUVFTyxVQUFBQSxRQUFRLEVBQUUsTUFGWjtBQUdFQyxVQUFBQSxTQUFTLEVBQUU7QUFDVHFCLFlBQUFBLENBQUMsRUFBRSxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsT0FBZjtBQURNO0FBSGIsU0FESztBQUZNLE9BQWY7QUFhQSxVQUFNZixVQUFVLEdBQUcsdUJBQWFELE1BQWIsQ0FBbkI7QUFDQWYsTUFBQUEsTUFBTSxDQUFDZ0IsVUFBRCxDQUFOLENBQW1CQyxJQUFuQixDQUF3QiwwQkFBeEI7QUFDRCxLQWhCQyxDQUFGO0FBa0JBckIsSUFBQUEsRUFBRSxDQUFDLG1CQUFELEVBQXNCLFlBQU07QUFDNUIsVUFBTW1CLE1BQU0sR0FBRztBQUNiYixRQUFBQSxJQUFJLEVBQUUsWUFETztBQUViTSxRQUFBQSxLQUFLLEVBQUUsQ0FDTDtBQUNFTixVQUFBQSxJQUFJLEVBQUUsVUFEUjtBQUVFTyxVQUFBQSxRQUFRLEVBQUUsTUFGWjtBQUdFQyxVQUFBQSxTQUFTLEVBQUU7QUFDVHNCLFlBQUFBLEtBQUssRUFBRSxDQUFDLFNBQUQsQ0FERTtBQUVUQyxZQUFBQSxPQUFPLEVBQUUsQ0FBQyxNQUFELENBRkE7QUFHVEYsWUFBQUEsQ0FBQyxFQUFFLENBQUMsS0FBRCxFQUFRLEtBQVIsRUFBZSxPQUFmO0FBSE07QUFIYixTQURLO0FBRk0sT0FBZjtBQWVBLFVBQU1mLFVBQVUsR0FBRyx1QkFBYUQsTUFBYixDQUFuQjtBQUNBZixNQUFBQSxNQUFNLENBQUNnQixVQUFELENBQU4sQ0FBbUJDLElBQW5CLENBQXdCLHlEQUF4QjtBQUNELEtBbEJDLENBQUY7QUFtQkQsR0F0Q08sQ0FBUjtBQXVDRCxDQWhtQk8sQ0FBUiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBMaWNlbnNlZCB0byBFbGFzdGljc2VhcmNoIEIuVi4gdW5kZXIgb25lIG9yIG1vcmUgY29udHJpYnV0b3JcbiAqIGxpY2Vuc2UgYWdyZWVtZW50cy4gU2VlIHRoZSBOT1RJQ0UgZmlsZSBkaXN0cmlidXRlZCB3aXRoXG4gKiB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gcmVnYXJkaW5nIGNvcHlyaWdodFxuICogb3duZXJzaGlwLiBFbGFzdGljc2VhcmNoIEIuVi4gbGljZW5zZXMgdGhpcyBmaWxlIHRvIHlvdSB1bmRlclxuICogdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heVxuICogbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbiAqIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4gKiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuICogS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4gKiBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4gKiB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgeyB0b0V4cHJlc3Npb24gfSBmcm9tICcuL2FzdCc7XG5cbmRlc2NyaWJlKCdhc3QgdG9FeHByZXNzaW9uJywgKCkgPT4ge1xuICBkZXNjcmliZSgnc2luZ2xlIGV4cHJlc3Npb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Rocm93cyBpZiBubyB0eXBlIGluY2x1ZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXJyTXNnID0gJ09iamVjdHMgbXVzdCBoYXZlIGEgdHlwZSBwcm9wZXJ0eSc7XG4gICAgICBjb25zdCBhc3RPYmplY3QgPSB7IGhlbGxvOiAnd29ybGQnIH07XG4gICAgICBleHBlY3QoKCkgPT4gdG9FeHByZXNzaW9uKGFzdE9iamVjdCkpLnRvVGhyb3dFcnJvcihlcnJNc2cpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Rocm93cyBpZiBub3QgY29ycmVjdCB0eXBlJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXJyTXNnID0gJ0V4cHJlc3Npb24gbXVzdCBiZSBhbiBleHByZXNzaW9uIG9yIGFyZ3VtZW50IGZ1bmN0aW9uJztcbiAgICAgIGNvbnN0IGFzdE9iamVjdCA9IHtcbiAgICAgICAgdHlwZTogJ2hpJyxcbiAgICAgICAgaGVsbG86ICd3b3JsZCcsXG4gICAgICB9O1xuICAgICAgZXhwZWN0KCgpID0+IHRvRXhwcmVzc2lvbihhc3RPYmplY3QpKS50b1Rocm93RXJyb3IoZXJyTXNnKTtcbiAgICB9KTtcblxuICAgIGl0KCd0aHJvd3MgaWYgZXhwcmVzc2lvbiB3aXRob3V0IGNoYWluJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXJyTXNnID0gJ0V4cHJlc3Npb25zIG11c3QgY29udGFpbiBhIGNoYWluJztcbiAgICAgIGNvbnN0IGFzdE9iamVjdCA9IHtcbiAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICBoZWxsbzogJ3dvcmxkJyxcbiAgICAgIH07XG4gICAgICBleHBlY3QoKCkgPT4gdG9FeHByZXNzaW9uKGFzdE9iamVjdCkpLnRvVGhyb3dFcnJvcihlcnJNc2cpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Rocm93cyBpZiBhcmd1bWVudHMgdHlwZSBpcyBpbnZhbGlkJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXJyTXNnID0gJ0FyZ3VtZW50cyBjYW4gb25seSBiZSBhbiBvYmplY3QnO1xuICAgICAgY29uc3QgaW52YWxpZFR5cGVzID0gW251bGwsIFtdXTtcblxuICAgICAgZnVuY3Rpb24gdmFsaWRhdGUob2JqKSB7XG4gICAgICAgIGV4cGVjdCgoKSA9PiB0b0V4cHJlc3Npb24ob2JqKSkudG9UaHJvd0Vycm9yKGVyck1zZyk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW52YWxpZFR5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGFzdE9iamVjdCA9IHtcbiAgICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgZnVuY3Rpb246ICd0ZXN0JyxcbiAgICAgICAgICAgICAgYXJndW1lbnRzOiBpbnZhbGlkVHlwZXNbaV0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICB2YWxpZGF0ZShhc3RPYmplY3QpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaXQoJ3Rocm93cyBpZiBmdW5jdGlvbiBhcmd1bWVudHMgdHlwZSBpcyBpbnZhbGlkJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXJyTXNnID0gJ0FyZ3VtZW50cyBjYW4gb25seSBiZSBhbiBvYmplY3QnO1xuICAgICAgY29uc3QgYXN0T2JqZWN0ID0ge1xuICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICBmdW5jdGlvbjogJ3BvaW50c2VyaWVzJyxcbiAgICAgICAgYXJndW1lbnRzOiBudWxsLFxuICAgICAgfTtcbiAgICAgIGV4cGVjdCgoKSA9PiB0b0V4cHJlc3Npb24oYXN0T2JqZWN0KSkudG9UaHJvd0Vycm9yKGVyck1zZyk7XG4gICAgfSk7XG5cbiAgICBpdCgndGhyb3dzIG9uIGludmFsaWQgYXJndW1lbnQgdHlwZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGFyZ1R5cGUgPSAnX19pbnZhbGlkX193YXRfXyc7XG4gICAgICBjb25zdCBlcnJNc2cgPSBgSW52YWxpZCBhcmd1bWVudCB0eXBlIGluIEFTVDogJHthcmdUeXBlfWA7XG4gICAgICBjb25zdCBhc3RPYmplY3QgPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICd0ZXN0JyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICB0ZXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogYXJnVHlwZSxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiAnaW52YWxpZCB0eXBlJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgICAgZXhwZWN0KCgpID0+IHRvRXhwcmVzc2lvbihhc3RPYmplY3QpKS50b1Rocm93RXJyb3IoZXJyTXNnKTtcbiAgICB9KTtcblxuICAgIGl0KCd0aHJvd3Mgb24gZXhwcmVzc2lvbnMgd2l0aG91dCBjaGFpbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBlcnJNc2cgPSAnRXhwcmVzc2lvbnMgbXVzdCBjb250YWluIGEgY2hhaW4nO1xuXG4gICAgICBjb25zdCBhc3RPYmplY3QgPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICd0ZXN0JyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICB0ZXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgaW52YWxpZDogJ25vIGNoYWluIGhlcmUnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuXG4gICAgICBleHBlY3QoKCkgPT4gdG9FeHByZXNzaW9uKGFzdE9iamVjdCkpLnRvVGhyb3dFcnJvcihlcnJNc2cpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Rocm93cyBvbiBuYW1lbGVzcyBmdW5jdGlvbnMgYW5kIHBhcnRpYWxzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZXJyTXNnID0gJ0Z1bmN0aW9ucyBtdXN0IGhhdmUgYSBmdW5jdGlvbiBuYW1lJztcblxuICAgICAgY29uc3QgYXN0T2JqZWN0ID0ge1xuICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgIGNoYWluOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgICAgZXhwZWN0KCgpID0+IHRvRXhwcmVzc2lvbihhc3RPYmplY3QpKS50b1Rocm93RXJyb3IoZXJyTXNnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaW5nbGUgZXhwcmVzc2lvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IGFzdE9iaiA9IHtcbiAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICBjaGFpbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ2NzdicsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHt9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHByZXNzaW9uID0gdG9FeHByZXNzaW9uKGFzdE9iaik7XG4gICAgICBleHBlY3QoZXhwcmVzc2lvbikudG9CZSgnY3N2Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2luZ2xlIGV4cHJlc3Npb24gd2l0aCBzdHJpbmcgYXJndW1lbnQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhc3RPYmogPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdjc3YnLFxuICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgIGlucHV0OiBbJ3N0dWZmXFxudGhpbmdzJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHByZXNzaW9uID0gdG9FeHByZXNzaW9uKGFzdE9iaik7XG4gICAgICBleHBlY3QoZXhwcmVzc2lvbikudG9CZSgnY3N2IGlucHV0PVwic3R1ZmZcXG50aGluZ3NcIicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NpbmdsZSBleHByZXNzaW9uIHN0cmluZyB2YWx1ZSB3aXRoIGEgYmFja3NsYXNoJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXN0T2JqID0ge1xuICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgIGNoYWluOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnY3N2JyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICBpbnB1dDogWydzbGFzaCBcXFxcXFxcXCBzbGFzaCddLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHRvRXhwcmVzc2lvbihhc3RPYmopO1xuICAgICAgZXhwZWN0KGV4cHJlc3Npb24pLnRvQmUoJ2NzdiBpbnB1dD1cInNsYXNoIFxcXFxcXFxcXFxcXFxcXFwgc2xhc2hcIicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NpbmdsZSBleHByZXNzaW9uIHN0cmluZyB2YWx1ZSB3aXRoIGEgZG91YmxlIHF1b3RlJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXN0T2JqID0ge1xuICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgIGNoYWluOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnY3N2JyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICBpbnB1dDogWydzdHVmZlxcbnRoaW5nc1xcblwic3VjaFwiJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHByZXNzaW9uID0gdG9FeHByZXNzaW9uKGFzdE9iaik7XG4gICAgICBleHBlY3QoZXhwcmVzc2lvbikudG9CZSgnY3N2IGlucHV0PVwic3R1ZmZcXG50aGluZ3NcXG5cXFxcXCJzdWNoXFxcXFwiXCInKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaW5nbGUgZXhwcmVzc2lvbiB3aXRoIG51bWJlciBhcmd1bWVudCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGFzdE9iaiA9IHtcbiAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICBjaGFpbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ3NlcmllcycsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgaW5wdXQ6IFsxMjM0XSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGV4cGVjdChleHByZXNzaW9uKS50b0JlKCdzZXJpZXMgaW5wdXQ9MTIzNCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NpbmdsZSBleHByZXNzaW9uIHdpdGggYm9vbGVhbiBhcmd1bWVudCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGFzdE9iaiA9IHtcbiAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICBjaGFpbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ3NlcmllcycsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgaW5wdXQ6IFt0cnVlXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGV4cGVjdChleHByZXNzaW9uKS50b0JlKCdzZXJpZXMgaW5wdXQ9dHJ1ZScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NpbmdsZSBleHByZXNzaW9uIHdpdGggbnVsbCBhcmd1bWVudCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGFzdE9iaiA9IHtcbiAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICBjaGFpbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ3NlcmllcycsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgaW5wdXQ6IFtudWxsXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGV4cGVjdChleHByZXNzaW9uKS50b0JlKCdzZXJpZXMgaW5wdXQ9bnVsbCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NpbmdsZSBleHByZXNzaW9uIHdpdGggbXVsdGlwbGUgYXJndW1lbnRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXN0T2JqID0ge1xuICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgIGNoYWluOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnY3N2JyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICBpbnB1dDogWydzdHVmZlxcbnRoaW5ncyddLFxuICAgICAgICAgICAgICBzZXBhcmF0b3I6IFsnXFxcXG4nXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGV4cGVjdChleHByZXNzaW9uKS50b0JlKCdjc3YgaW5wdXQ9XCJzdHVmZlxcbnRoaW5nc1wiIHNlcGFyYXRvcj1cIlxcXFxcXFxcblwiJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2luZ2xlIGV4cHJlc3Npb24gd2l0aCBtdWx0aXBsZSBhbmQgcmVwZWF0ZWQgYXJndW1lbnRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXN0T2JqID0ge1xuICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgIGNoYWluOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnY3N2JyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICBpbnB1dDogWydzdHVmZlxcbnRoaW5ncycsICdtb3JlLHRoaW5nc1xcbm1vcmUsc3R1ZmYnXSxcbiAgICAgICAgICAgICAgc2VwYXJhdG9yOiBbJ1xcXFxuJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHByZXNzaW9uID0gdG9FeHByZXNzaW9uKGFzdE9iaik7XG4gICAgICBleHBlY3QoZXhwcmVzc2lvbikudG9CZShcbiAgICAgICAgJ2NzdiBpbnB1dD1cInN0dWZmXFxudGhpbmdzXCIgaW5wdXQ9XCJtb3JlLHRoaW5nc1xcbm1vcmUsc3R1ZmZcIiBzZXBhcmF0b3I9XCJcXFxcXFxcXG5cIidcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2luZ2xlIGV4cHJlc3Npb24gd2l0aCBgZ2V0Y2FsY2AgZXhwcmVzc2lvbiBhcmd1bWVudCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGFzdE9iaiA9IHtcbiAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICBjaGFpbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ2NzdicsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgY2FsYzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgICAgICAgICAgIGNoYWluOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uOiAnZ2V0Y2FsYycsXG4gICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgaW5wdXQ6IFsnc3R1ZmZcXG50aGluZ3MnXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGV4cGVjdChleHByZXNzaW9uKS50b0JlKCdjc3YgY2FsYz17Z2V0Y2FsY30gaW5wdXQ9XCJzdHVmZlxcbnRoaW5nc1wiJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2luZ2xlIGV4cHJlc3Npb24gd2l0aCBgcGFydGNhbGNgIGV4cHJlc3Npb24gYXJndW1lbnQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhc3RPYmogPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdjc3YnLFxuICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgIGNhbGM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgICAgICAgICAgICBjaGFpbjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbjogJ3BhcnRjYWxjJyxcbiAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IHt9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBpbnB1dDogWydzdHVmZlxcbnRoaW5ncyddLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHRvRXhwcmVzc2lvbihhc3RPYmopO1xuICAgICAgZXhwZWN0KGV4cHJlc3Npb24pLnRvQmUoJ2NzdiBjYWxjPXtwYXJ0Y2FsY30gaW5wdXQ9XCJzdHVmZlxcbnRoaW5nc1wiJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2luZ2xlIGV4cHJlc3Npb24gd2l0aCBleHByZXNzaW9uIGFyZ3VtZW50cywgd2l0aCBhcmd1bWVudHMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhc3RPYmogPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdjc3YnLFxuICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgIHNlcDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgICAgICAgICAgIGNoYWluOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uOiAncGFydGNhbGMnLFxuICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogWydjb21tYSddLFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIGlucHV0OiBbJ3N0dWZmXFxudGhpbmdzJ10sXG4gICAgICAgICAgICAgIGJyZWFrOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb246ICdzZXRCcmVhaycsXG4gICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBbJ25ld2xpbmUnXSxcbiAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHRvRXhwcmVzc2lvbihhc3RPYmopO1xuICAgICAgZXhwZWN0KGV4cHJlc3Npb24pLnRvQmUoXG4gICAgICAgICdjc3Ygc2VwPXtwYXJ0Y2FsYyB0eXBlPVwiY29tbWFcIn0gaW5wdXQ9XCJzdHVmZlxcbnRoaW5nc1wiIGJyZWFrPXtzZXRCcmVhayB0eXBlPVwibmV3bGluZVwifSdcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdtdWx0aXBsZSBleHByZXNzaW9ucycsICgpID0+IHtcbiAgICBpdCgndHdvIGNoYWluZWQgZXhwcmVzc2lvbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhc3RPYmogPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdjc3YnLFxuICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgIGlucHV0OiBbXG4gICAgICAgICAgICAgICAgJ3llYXIsbWFrZSxtb2RlbCxwcmljZVxcbjIwMTYsaG9uZGEsY3ItdiwyMzg0NVxcbjIwMTYsaG9uZGEsZml0LDE1ODkwLFxcbjIwMTYsaG9uZGEsY2l2aWMsMTg2NDAnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ2xpbmUnLFxuICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgIHg6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgICAgICAgICAgICBjaGFpbjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbjogJ2Rpc3RpbmN0JyxcbiAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGY6IFsneWVhciddLFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHk6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgICAgICAgICAgICBjaGFpbjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbjogJ3N1bScsXG4gICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmOiBbJ3ByaWNlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgY29sb3JzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb246ICdkaXN0aW5jdCcsXG4gICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmOiBbJ21vZGVsJ10sXG4gICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gW1xuICAgICAgICAnY3N2IFxcbiAgaW5wdXQ9XCJ5ZWFyLG1ha2UsbW9kZWwscHJpY2UnLFxuICAgICAgICAnMjAxNixob25kYSxjci12LDIzODQ1JyxcbiAgICAgICAgJzIwMTYsaG9uZGEsZml0LDE1ODkwLCcsXG4gICAgICAgICcyMDE2LGhvbmRhLGNpdmljLDE4NjQwXCJcXG58IGxpbmUgeD17ZGlzdGluY3QgZj1cInllYXJcIn0geT17c3VtIGY9XCJwcmljZVwifSBjb2xvcnM9e2Rpc3RpbmN0IGY9XCJtb2RlbFwifScsXG4gICAgICBdO1xuICAgICAgZXhwZWN0KGV4cHJlc3Npb24pLnRvQmUoZXhwZWN0ZWQuam9pbignXFxuJykpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3RocmVlIGNoYWluZWQgZXhwcmVzc2lvbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhc3RPYmogPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdjc3YnLFxuICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgIGlucHV0OiBbXG4gICAgICAgICAgICAgICAgJ3llYXIsbWFrZSxtb2RlbCxwcmljZVxcbjIwMTYsaG9uZGEsY3ItdiwyMzg0NVxcbjIwMTYsaG9uZGEsZml0LDE1ODkwLFxcbjIwMTYsaG9uZGEsY2l2aWMsMTg2NDAnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBmdW5jdGlvbjogJ3BvaW50c2VyaWVzJyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICB4OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb246ICdkaXN0aW5jdCcsXG4gICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmOiBbJ3llYXInXSxcbiAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICB5OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb246ICdzdW0nLFxuICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZjogWydwcmljZSddLFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIGNvbG9yczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgICAgICAgICAgIGNoYWluOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uOiAnZGlzdGluY3QnLFxuICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZjogWydtb2RlbCddLFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnbGluZScsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgcGFsbGV0dGU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgICAgICAgICAgICBjaGFpbjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbjogJ2dldENvbG9yUGFsbGV0dGUnLFxuICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogWydlbGFzdGljJ10sXG4gICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gW1xuICAgICAgICAnY3N2IFxcbiAgaW5wdXQ9XCJ5ZWFyLG1ha2UsbW9kZWwscHJpY2UnLFxuICAgICAgICAnMjAxNixob25kYSxjci12LDIzODQ1JyxcbiAgICAgICAgJzIwMTYsaG9uZGEsZml0LDE1ODkwLCcsXG4gICAgICAgICcyMDE2LGhvbmRhLGNpdmljLDE4NjQwXCJcXG58IHBvaW50c2VyaWVzIHg9e2Rpc3RpbmN0IGY9XCJ5ZWFyXCJ9IHk9e3N1bSBmPVwicHJpY2VcIn0gJyArXG4gICAgICAgICAgJ2NvbG9ycz17ZGlzdGluY3QgZj1cIm1vZGVsXCJ9XFxufCBsaW5lIHBhbGxldHRlPXtnZXRDb2xvclBhbGxldHRlIG5hbWU9XCJlbGFzdGljXCJ9JyxcbiAgICAgIF07XG4gICAgICBleHBlY3QoZXhwcmVzc2lvbikudG9CZShleHBlY3RlZC5qb2luKCdcXG4nKSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd1bm5hbWVkIGFyZ3VtZW50cycsICgpID0+IHtcbiAgICBpdCgnb25seSB1bm5hbWVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYXN0T2JqID0ge1xuICAgICAgICB0eXBlOiAnZXhwcmVzc2lvbicsXG4gICAgICAgIGNoYWluOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uOiAnbGlzdCcsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgXzogWydvbmUnLCAndHdvJywgJ3RocmVlJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHByZXNzaW9uID0gdG9FeHByZXNzaW9uKGFzdE9iaik7XG4gICAgICBleHBlY3QoZXhwcmVzc2lvbikudG9CZSgnbGlzdCBcIm9uZVwiIFwidHdvXCIgXCJ0aHJlZVwiJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnbmFtZWQgYW5kIHVubmFtZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBhc3RPYmogPSB7XG4gICAgICAgIHR5cGU6ICdleHByZXNzaW9uJyxcbiAgICAgICAgY2hhaW46IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdib3RoJyxcbiAgICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgICBuYW1lZDogWydleGFtcGxlJ10sXG4gICAgICAgICAgICAgIGFub3RoZXI6IFsnaXRlbSddLFxuICAgICAgICAgICAgICBfOiBbJ29uZScsICd0d28nLCAndGhyZWUnXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0b0V4cHJlc3Npb24oYXN0T2JqKTtcbiAgICAgIGV4cGVjdChleHByZXNzaW9uKS50b0JlKCdib3RoIG5hbWVkPVwiZXhhbXBsZVwiIGFub3RoZXI9XCJpdGVtXCIgXCJvbmVcIiBcInR3b1wiIFwidGhyZWVcIicpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19