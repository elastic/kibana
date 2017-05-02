import expect from 'expect.js';
import { toExpression } from '../ast';

describe('ast toExpression', () => {
  describe('single expression', () => {
    it('throws if not correct type', () => {
      const errMsg = 'Expression must be a partial, expression, or argument function';
      const astObject = { hello: 'world' };
      expect(() => toExpression(astObject)).to.throwException(errMsg);
    });

    it('throws if expression without chain', () => {
      const errMsg = 'Partials or expressions must contain a chain';
      const astObject = {
        type: 'expression',
        hello: 'world',
      };
      expect(() => toExpression(astObject)).to.throwException(errMsg);
    });

    it('throws if arguments type is invalid', () => {
      const errMsg = 'Arguments can only be an object';
      const invalidTypes = [null, []];

      function validate(obj) {
        expect(() => toExpression(obj)).to.throwException(errMsg);
      }

      for (let i = 0; i < invalidTypes.length; i++) {
        const astObject = {
          type: 'expression',
          chain: [{
            type: 'function',
            function: 'test',
            arguments: invalidTypes[i],
          }],
        };

        // eslint-disable-next-line no-loop-func
        validate(astObject);
      }
    });

    it('throws if function arguments type is invalid', () => {
      const errMsg = 'Arguments can only be an object';
      const astObject = {
        type: 'function',
        functoin: 'pointseries',
        arguments: null,
      };
      expect(() => toExpression(astObject)).to.throwException(errMsg);
    });

    it('throws on invalid argument type', () => {
      const argType = '__invalid__wat__';
      const errMsg = `invalid argument type: ${argType}`;
      const astObject = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'test',
          arguments: {
            test: [{
              type: argType,
              value: 'invalid type',
            }]
          },
        }],
      };

      expect(() => toExpression(astObject)).to.throwException(errMsg);
    });

    it('throws on partials and expressions without chains', () => {
      const errMsg = 'expression and partial arguments must contain a chain';
      const chainTypes = ['expression', 'partial'];

      function validate(obj) {
        expect(() => toExpression(obj)).to.throwException(errMsg);
      }

      for (let i = 0; i < chainTypes.length; i++) {
        const astObject = {
          type: 'expression',
          chain: [{
            type: 'function',
            function: 'test',
            arguments: {
              test: [{
                type: chainTypes[i],
                invalid: 'no chain here',
              }]
            },
          }],
        };

        validate(astObject);
      }
    });

    it('throws on nameless functions and partials', () => {
      const errMsg = 'Functions and partials must have a function name';
      const chainTypes = ['function', 'partial'];

      function validate(obj) {
        expect(() => toExpression(obj)).to.throwException(errMsg);
      }

      for (let i = 0; i < chainTypes.length; i++) {
        const astObject = {
          type: 'expression',
          chain: [{
            type: chainTypes[i],
            function: '',
          }],
        };

        validate(astObject);
      }
    });

    it('single expression', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {}
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv()');
    });

    it('single expression with argument', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: [{
              type: 'string',
              value: 'stuff\nthings',
            }]
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv(input="stuff\nthings")');
    });

    it('single expression with multiple arguments', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: [{
              type: 'string',
              value: 'stuff\nthings',
            }],
            separator: [{
              type: 'string',
              value: '\\n',
            }]
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv(input="stuff\nthings", separator="\\n")');
    });

    it('single expression with multiple and repeated arguments', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: [{
              type: 'string',
              value: 'stuff\nthings',
            }, {
              type: 'string',
              value: 'more,things\nmore,stuff',
            }],
            separator: [{
              type: 'string',
              value: '\\n',
            }]
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv(input="stuff\nthings", input="more,things\nmore,stuff", separator="\\n")');
    });

    it('single expression with expression argument', () => {
      const astObj = {
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
                arguments: {},
              }],
            }],
            input: [{
              type: 'string',
              value: 'stuff\nthings',
            }],
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv(calc=getcalc(), input="stuff\nthings")');
    });

    it('single expression with partial argument', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            calc: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'partcalc',
                arguments: {},
              }],
            }],
            input: [{
              type: 'string',
              value: 'stuff\nthings',
            }],
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv(calc=.partcalc(), input="stuff\nthings")');
    });

    it('single expression with partial and expression arguments, with arguments', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            sep: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'partcalc',
                arguments: {
                  type: [{
                    type: 'string',
                    value: 'comma',
                  }]
                },
              }],
            }],
            input: [{
              type: 'string',
              value: 'stuff\nthings',
            }],
            break: [{
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'setBreak',
                arguments: {
                  type: [{
                    type: 'string',
                    value: 'newline',
                  }],
                },
              }],
            }],
          },
        }],
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('csv(sep=.partcalc(type="comma"), input="stuff\nthings", break=setBreak(type="newline"))');
    });
  });

  describe('multiple expressions', () => {
    it('two chained expressions', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: [{
              type: 'string',
              value: 'year,make,model,price\n2016,honda,cr-v,23845\n2016,honda,fit,15890,\n2016,honda,civic,18640'
            }]
          }
        }, {
          type: 'function',
          function: 'line',
          arguments: {
            x: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: [{
                    type: 'string',
                    value: 'year'
                  }]
                }
              }]
            }],
            y: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'sum',
                arguments: {
                  f: [{
                    type: 'string',
                    value: 'price'
                  }]
                }
              }]
            }],
            colors: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: [{
                    type: 'string',
                    value: 'model'
                  }]
                }
              }]
            }]
          }
        }]
      };

      const expression = toExpression(astObj);
      const expected = [
        'csv(input="year,make,model,price',
        '2016,honda,cr-v,23845',
        '2016,honda,fit,15890,',
        '2016,honda,civic,18640").line(x=.distinct(f="year"), y=.sum(f="price"), colors=.distinct(f="model"))'
      ];
      expect(expression).to.equal(expected.join('\n'));
    });

    it('three chained expressions', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'csv',
          arguments: {
            input: [{
              type: 'string',
              value: 'year,make,model,price\n2016,honda,cr-v,23845\n2016,honda,fit,15890,\n2016,honda,civic,18640'
            }]
          }
        }, {
          type: 'function',
          function: 'pointseries',
          arguments: {
            x: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: [{
                    type: 'string',
                    value: 'year'
                  }]
                }
              }]
            }],
            y: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'sum',
                arguments: {
                  f: [{
                    type: 'string',
                    value: 'price'
                  }]
                }
              }]
            }],
            colors: [{
              type: 'partial',
              chain: [{
                type: 'function',
                function: 'distinct',
                arguments: {
                  f: [{
                    type: 'string',
                    value: 'model'
                  }]
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
                  name: [{
                    type: 'string',
                    value: 'elastic',
                  }],
                },
              }],
            }],
          },
        }]
      };

      const expression = toExpression(astObj);
      const expected = [
        'csv(input="year,make,model,price',
        '2016,honda,cr-v,23845',
        '2016,honda,fit,15890,',
        '2016,honda,civic,18640").pointseries(x=.distinct(f="year"), y=.sum(f="price"), ' +
          'colors=.distinct(f="model")).line(pallette=getColorPallette(name="elastic"))'
      ];
      expect(expression).to.equal(expected.join('\n'));
    });
  });

  describe('partial expressions', () => {
    it('resolve partial expression', () => {
      const astObj = {
        type: 'function',
        function: 'pointseries',
        arguments: {
          x: [{ type: 'string', value: 'time' }],
          y: [{
            type: 'partial',
            chain: [{
              type: 'partial',
              function: 'math',
              arguments: {
                _: [{
                  type: 'string',
                  value: 'sum(price)',
                }],
              },
            }]
          }],
        },
      };
      expect(toExpression(astObj)).to.equal('pointseries(x="time", y=.math("sum(price)"))');
    });
  });

  describe('unnamed arguments', () => {
    it('only unnamed', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'list',
          arguments: {
            _: [{
              type: 'string',
              value: 'one',
            }, {
              type: 'string',
              value: 'two',
            }, {
              type: 'string',
              value: 'three',
            }],
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('list("one", "two", "three")');
    });

    it('named and unnamed', () => {
      const astObj = {
        type: 'expression',
        chain: [{
          type: 'function',
          function: 'both',
          arguments: {
            named: [{
              type: 'string',
              value: 'example',
            }],
            another: [{
              type: 'string',
              value: 'item',
            }],
            _: [{
              type: 'string',
              value: 'one',
            }, {
              type: 'string',
              value: 'two',
            }, {
              type: 'string',
              value: 'three',
            }],
          }
        }]
      };

      const expression = toExpression(astObj);
      expect(expression).to.equal('both(named="example", another="item", "one", "two", "three")');
    });
  });
});
