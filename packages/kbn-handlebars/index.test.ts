/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

/**
 * ABOUT THIS FILE:
 *
 * This file is for tests not copied from the upstream handlebars project, but
 * tests that we feel are needed in order to fully cover our use-cases.
 */

import Handlebars from '.';
import { expectTemplate, forEachCompileFunctionName } from './src/__jest__/test_bench';

it('Handlebars.create', () => {
  expect(Handlebars.create()).toMatchSnapshot();
});

describe('Handlebars.compileAST', () => {
  describe('compiler options', () => {
    it('noEscape', () => {
      expectTemplate('{{value}}').withInput({ value: '<foo>' }).toCompileTo('&lt;foo&gt;');

      expectTemplate('{{value}}')
        .withCompileOptions({ noEscape: false })
        .withInput({ value: '<foo>' })
        .toCompileTo('&lt;foo&gt;');

      expectTemplate('{{value}}')
        .withCompileOptions({ noEscape: true })
        .withInput({ value: '<foo>' })
        .toCompileTo('<foo>');
    });
  });

  it('invalid template', () => {
    expectTemplate('{{value').withInput({ value: 42 }).toThrow(`Parse error on line 1:
{{value
--^
Expecting 'ID', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'`);
  });

  if (!process.env.EVAL) {
    it('reassign', () => {
      const fn = Handlebars.compileAST;
      expect(fn('{{value}}')({ value: 42 })).toEqual('42');
    });
  }
});

// Extra "helpers" tests
describe('helpers', () => {
  it('Only provide options.fn/inverse to block helpers', () => {
    function toHaveProperties(...args: any[]) {
      toHaveProperties.calls++;
      const options = args[args.length - 1];
      expect(options).toHaveProperty('fn');
      expect(options).toHaveProperty('inverse');
      return 42;
    }
    toHaveProperties.calls = 0;

    function toNotHaveProperties(...args: any[]) {
      toNotHaveProperties.calls++;
      const options = args[args.length - 1];
      expect(options).not.toHaveProperty('fn');
      expect(options).not.toHaveProperty('inverse');
      return 42;
    }
    toNotHaveProperties.calls = 0;

    const nonBlockTemplates = ['{{foo}}', '{{foo 1 2}}'];
    const blockTemplates = ['{{#foo}}42{{/foo}}', '{{#foo 1 2}}42{{/foo}}'];

    for (const template of nonBlockTemplates) {
      expectTemplate(template)
        .withInput({
          foo: toNotHaveProperties,
        })
        .toCompileTo('42');

      expectTemplate(template).withHelper('foo', toNotHaveProperties).toCompileTo('42');
    }

    for (const template of blockTemplates) {
      expectTemplate(template)
        .withInput({
          foo: toHaveProperties,
        })
        .toCompileTo('42');

      expectTemplate(template).withHelper('foo', toHaveProperties).toCompileTo('42');
    }

    const factor = process.env.AST || process.env.EVAL ? 1 : 2;
    expect(toNotHaveProperties.calls).toEqual(nonBlockTemplates.length * 2 * factor);
    expect(toHaveProperties.calls).toEqual(blockTemplates.length * 2 * factor);
  });

  it('should pass expected "this" to helper functions (without input)', () => {
    expectTemplate('{{hello "world" 12 true false}}')
      .withHelper('hello', function (this: any, ...args: any[]) {
        expect(this).toMatchInlineSnapshot(`Object {}`);
      })
      .toCompileTo('');
  });

  it('should pass expected "this" to helper functions (with input)', () => {
    expectTemplate('{{hello "world" 12 true false}}')
      .withHelper('hello', function (this: any, ...args: any[]) {
        expect(this).toMatchInlineSnapshot(`
          Object {
            "people": Array [
              Object {
                "id": 1,
                "name": "Alan",
              },
              Object {
                "id": 2,
                "name": "Yehuda",
              },
            ],
          }
        `);
      })
      .withInput({
        people: [
          { name: 'Alan', id: 1 },
          { name: 'Yehuda', id: 2 },
        ],
      })
      .toCompileTo('');
  });

  it('should pass expected "this" and arguments to helper functions (non-block helper)', () => {
    expectTemplate('{{hello "world" 12 true false}}')
      .withHelper('hello', function (this: any, ...args: any[]) {
        expect(args).toMatchInlineSnapshot(`
          Array [
            "world",
            12,
            true,
            false,
            Object {
              "data": Object {
                "root": Object {
                  "people": Array [
                    Object {
                      "id": 1,
                      "name": "Alan",
                    },
                    Object {
                      "id": 2,
                      "name": "Yehuda",
                    },
                  ],
                },
              },
              "hash": Object {},
              "loc": Object {
                "end": Object {
                  "column": 31,
                  "line": 1,
                },
                "start": Object {
                  "column": 0,
                  "line": 1,
                },
              },
              "lookupProperty": [Function],
              "name": "hello",
            },
          ]
        `);
      })
      .withInput({
        people: [
          { name: 'Alan', id: 1 },
          { name: 'Yehuda', id: 2 },
        ],
      })
      .toCompileTo('');
  });

  it('should pass expected "this" and arguments to helper functions (block helper)', () => {
    expectTemplate('{{#hello "world" 12 true false}}{{/hello}}')
      .withHelper('hello', function (this: any, ...args: any[]) {
        expect(args).toMatchInlineSnapshot(`
          Array [
            "world",
            12,
            true,
            false,
            Object {
              "data": Object {
                "root": Object {
                  "people": Array [
                    Object {
                      "id": 1,
                      "name": "Alan",
                    },
                    Object {
                      "id": 2,
                      "name": "Yehuda",
                    },
                  ],
                },
              },
              "fn": [Function],
              "hash": Object {},
              "inverse": [Function],
              "loc": Object {
                "end": Object {
                  "column": 42,
                  "line": 1,
                },
                "start": Object {
                  "column": 0,
                  "line": 1,
                },
              },
              "lookupProperty": [Function],
              "name": "hello",
            },
          ]
        `);
      })
      .withInput({
        people: [
          { name: 'Alan', id: 1 },
          { name: 'Yehuda', id: 2 },
        ],
      })
      .toCompileTo('');
  });
});

// Extra "blocks" tests
describe('blocks', () => {
  describe('decorators', () => {
    it('should only call decorator once', () => {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;
      expectTemplate('{{#helper}}{{*decorator}}{{/helper}}')
        .withHelper('helper', () => {})
        .withDecorator('decorator', () => {
          calls++;
        })
        .toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    forEachCompileFunctionName((compileName) => {
      it(`should call decorator again if render function is called again for #${compileName}`, () => {
        global.kbnHandlebarsEnv = Handlebars.create();

        kbnHandlebarsEnv!.registerDecorator('decorator', () => {
          calls++;
        });

        const compile = kbnHandlebarsEnv![compileName].bind(kbnHandlebarsEnv);
        const render = compile('{{*decorator}}');

        let calls = 0;
        expect(render()).toEqual('');
        expect(calls).toEqual(1);

        calls = 0;
        expect(render()).toEqual('');
        expect(calls).toEqual(1);

        global.kbnHandlebarsEnv = null;
      });
    });

    it('should pass expected options to nested decorator', () => {
      expectTemplate('{{#helper}}{{*decorator foo}}{{/helper}}')
        .withHelper('helper', () => {})
        .withDecorator('decorator', function (fn, props, container, options) {
          expect(options).toMatchInlineSnapshot(`
            Object {
              "args": Array [
                "bar",
              ],
              "data": Object {
                "root": Object {
                  "foo": "bar",
                },
              },
              "hash": Object {},
              "loc": Object {
                "end": Object {
                  "column": 29,
                  "line": 1,
                },
                "start": Object {
                  "column": 11,
                  "line": 1,
                },
              },
              "name": "decorator",
            }
          `);
        })
        .withInput({ foo: 'bar' })
        .toCompileTo('');
    });

    it('should pass expected options to root decorator', () => {
      expectTemplate('{{*decorator foo}}')
        .withDecorator('decorator', function (fn, props, container, options) {
          expect(options).toMatchInlineSnapshot(`
            Object {
              "args": Array [
                undefined,
              ],
              "data": Object {
                "root": Object {
                  "foo": "bar",
                },
              },
              "hash": Object {},
              "loc": Object {
                "end": Object {
                  "column": 18,
                  "line": 1,
                },
                "start": Object {
                  "column": 0,
                  "line": 1,
                },
              },
              "name": "decorator",
            }
          `);
        })
        .withInput({ foo: 'bar' })
        .toCompileTo('');
    });

    describe('registration', () => {
      beforeEach(() => {
        global.kbnHandlebarsEnv = Handlebars.create();
      });

      afterEach(() => {
        global.kbnHandlebarsEnv = null;
      });

      it('should be able to call decorators registered using the `registerDecorator` function', () => {
        let calls = 0;
        const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

        kbnHandlebarsEnv!.registerDecorator('decorator', () => {
          calls++;
        });

        expectTemplate('{{*decorator}}').toCompileTo('');
        expect(calls).toEqual(callsExpected);
      });

      it('should not be able to call decorators unregistered using the `unregisterDecorator` function', () => {
        let calls = 0;

        kbnHandlebarsEnv!.registerDecorator('decorator', () => {
          calls++;
        });

        kbnHandlebarsEnv!.unregisterDecorator('decorator');

        expectTemplate('{{*decorator}}').toThrow('lookupProperty(...) is not a function');
        expect(calls).toEqual(0);
      });
    });
  });
});
