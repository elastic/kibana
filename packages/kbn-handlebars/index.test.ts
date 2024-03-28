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
import type { HelperOptions, TemplateDelegate } from './src/types';
import { expectTemplate, forEachCompileFunctionName } from './src/__jest__/test_bench';

it('Handlebars.create', () => {
  expect(Handlebars.create()).toMatchSnapshot();
});

describe('Handlebars.compileAST', () => {
  describe('compiler options', () => {
    describe('noEscape', () => {
      describe('basic', () => {
        it('should escape a non-nested value with default value set for `noEscape`', () => {
          expectTemplate('{{value}}').withInput({ value: '<foo>' }).toCompileTo('&lt;foo&gt;');
        });

        it('should escape a nested value with default value set for `noEscape`', () => {
          expectTemplate('{{nested.value}}')
            .withInput({ nested: { value: '<foo>' } })
            .toCompileTo('&lt;foo&gt;');
        });

        it('should escape a non-nested value with `noEscape` set to false', () => {
          expectTemplate('{{value}}')
            .withCompileOptions({ noEscape: false })
            .withInput({ value: '<foo>' })
            .toCompileTo('&lt;foo&gt;');
        });

        it('should escape a nested value with `noEscape` set to false', () => {
          expectTemplate('{{nested.value}}')
            .withCompileOptions({ noEscape: false })
            .withInput({ nested: { value: '<foo>' } })
            .toCompileTo('&lt;foo&gt;');
        });

        it('should not escape a non-nested value with `noEscape` set to true', () => {
          expectTemplate('{{value}}')
            .withCompileOptions({ noEscape: true })
            .withInput({ value: '<foo>' })
            .toCompileTo('<foo>');
        });

        it('should not escape a nested value with `noEscape` set to true', () => {
          expectTemplate('{{nested.value}}')
            .withCompileOptions({ noEscape: true })
            .withInput({ nested: { value: '<foo>' } })
            .toCompileTo('<foo>');
        });
      });

      describe('known helper', () => {
        it('should escape a non-nested value with a known helper and default value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{value}}{{/with}}')
            .withInput({ foo: { value: '<bar>' } })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should escape a nested value with a known helper and default value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{nested.value}}{{/with}}')
            .withInput({ foo: { nested: { value: '<bar>' } } })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should escape a non-nested value with a known helper and false value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{value}}{{/with}}')
            .withCompileOptions({ noEscape: false })
            .withInput({ foo: { value: '<bar>' } })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should escape a nested value with a known helper and false value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{nested.value}}{{/with}}')
            .withCompileOptions({ noEscape: false })
            .withInput({ foo: { nested: { value: '<bar>' } } })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should not escape a non-nested value with a known helper and true value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{value}}{{/with}}')
            .withCompileOptions({ noEscape: true })
            .withInput({ foo: { value: '<bar>' } })
            .toCompileTo('<bar>');
        });

        it('should not escape a nested value with a known helper and true value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{nested.value}}{{/with}}')
            .withCompileOptions({ noEscape: true })
            .withInput({ foo: { nested: { value: '<bar>' } } })
            .toCompileTo('<bar>');
        });
      });

      describe('unknown helper', () => {
        it('should escape a non-nested value with an unknown helper and no value set for `noEscape`', () => {
          expectTemplate('{{foo value}}')
            .withHelper('foo', (value: string) => {
              return value + 'baz';
            })
            .withInput({ value: '<bar>' })
            .toCompileTo('&lt;bar&gt;baz');
        });

        it('should escape a nested value with an unknown helper and no value set for `noEscape`', () => {
          expectTemplate('{{foo nested.value}}')
            .withHelper('foo', (value: string) => {
              return value + 'baz';
            })
            .withInput({ nested: { value: '<bar>' } })
            .toCompileTo('&lt;bar&gt;baz');
        });

        it('should escape a non-nested value with an unknown helper and false value set for `noEscape`', () => {
          expectTemplate('{{foo value}}')
            .withHelper('foo', (value: string) => {
              return value + 'baz';
            })
            .withCompileOptions({ noEscape: false })
            .withInput({ value: '<bar>' })
            .toCompileTo('&lt;bar&gt;baz');
        });

        it('should escape a nested value with an unknown helper and false value set for `noEscape`', () => {
          expectTemplate('{{foo nested.value}}')
            .withHelper('foo', (value: string) => {
              return value + 'baz';
            })
            .withCompileOptions({ noEscape: false })
            .withInput({ nested: { value: '<bar>' } })
            .toCompileTo('&lt;bar&gt;baz');
        });

        it('should not escape a non-nested value with an unknown helper and true value set for `noEscape`', () => {
          expectTemplate('{{foo value}}')
            .withHelper('foo', (value: string) => {
              return value + 'baz';
            })
            .withCompileOptions({ noEscape: true })
            .withInput({ value: '<bar>' })
            .toCompileTo('<bar>baz');
        });

        it('should not escape a nested value with an unknown helper and true value set for `noEscape`', () => {
          expectTemplate('{{foo nested.value}}')
            .withHelper('foo', (value: string) => {
              return value + 'baz';
            })
            .withCompileOptions({ noEscape: true })
            .withInput({ nested: { value: '<bar>' } })
            .toCompileTo('<bar>baz');
        });
      });

      describe('blocks', () => {
        it('should escape a non-nested value with a block input and default value for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{#../myFunction}}{{value}}{{/../myFunction}}{{/with}}')
            .withInput({
              foo: { value: '<bar>' },
              myFunction() {
                return this;
              },
            })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should escape a non-nested value with an block input and false value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{#../myFunction}}{{value}}{{/../myFunction}}{{/with}}')
            .withInput({
              foo: { value: '<bar>' },
              myFunction() {
                return this;
              },
            })
            .withCompileOptions({ noEscape: false })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should not escape a non-nested value with an block input and true value set for `noEscape`', () => {
          expectTemplate('{{#with foo}}{{#../myFunction}}{{value}}{{/../myFunction}}{{/with}}')
            .withInput({
              foo: { value: '<bar>' },
              myFunction() {
                return this;
              },
            })
            .withCompileOptions({ noEscape: true })
            .toCompileTo('<bar>');
        });

        it('should escape a nested value with an block input and default value for `noEscape`', () => {
          expectTemplate(
            '{{#with foo}}{{#../myFunction}}{{nested.value}}{{/../myFunction}}{{/with}}'
          )
            .withInput({
              foo: { nested: { value: '<bar>' } },
              myFunction() {
                return this;
              },
            })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should escape a nested value with an block input and false value for `noEscape`', () => {
          expectTemplate(
            '{{#with foo}}{{#../myFunction}}{{nested.value}}{{/../myFunction}}{{/with}}'
          )
            .withInput({
              foo: { nested: { value: '<bar>' } },
              myFunction() {
                return this;
              },
            })
            .withCompileOptions({ noEscape: false })
            .toCompileTo('&lt;bar&gt;');
        });

        it('should escape a nested value with an block input and true value for `noEscape`', () => {
          expectTemplate(
            '{{#with foo}}{{#../myFunction}}{{nested.value}}{{/../myFunction}}{{/with}}'
          )
            .withInput({
              foo: { nested: { value: '<bar>' } },
              myFunction() {
                return this;
              },
            })
            .withCompileOptions({ noEscape: true })
            .toCompileTo('<bar>');
        });
      });
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

    it('should pass expected options to root decorator with no args', () => {
      expectTemplate('{{*decorator}}')
        .withDecorator('decorator', function (fn, props, container, options) {
          expect(options).toMatchInlineSnapshot(`
            Object {
              "args": Array [],
              "data": Object {
                "root": Object {
                  "foo": "bar",
                },
              },
              "hash": Object {},
              "loc": Object {
                "end": Object {
                  "column": 14,
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

    it('should pass expected options to root decorator with one arg', () => {
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

    describe('return values', () => {
      for (const [desc, template, result] of [
        ['non-block', '{{*decorator}}cont{{*decorator}}ent', 'content'],
        ['block', '{{#*decorator}}con{{/decorator}}tent', 'tent'],
      ]) {
        describe(desc, () => {
          const falsy = [undefined, null, false, 0, ''];
          const truthy = [true, 42, 'foo', {}];

          // Falsy return values from decorators are simply ignored and the
          // execution falls back to default behavior which is to render the
          // other parts of the template.
          for (const value of falsy) {
            it(`falsy value (type ${typeof value}): ${JSON.stringify(value)}`, () => {
              expectTemplate(template)
                .withDecorator('decorator', () => value)
                .toCompileTo(result);
            });
          }

          // Truthy return values from decorators are expected to be functions
          // and the program will attempt to call them. We expect an error to
          // be thrown in this case.
          for (const value of truthy) {
            it(`non-falsy value (type ${typeof value}): ${JSON.stringify(value)}`, () => {
              expectTemplate(template)
                .withDecorator('decorator', () => value)
                .toThrow('is not a function');
            });
          }

          // If the decorator return value is a custom function, its return
          // value will be the final content of the template.
          for (const value of [...falsy, ...truthy]) {
            it(`function returning ${typeof value}: ${JSON.stringify(value)}`, () => {
              expectTemplate(template)
                .withDecorator('decorator', () => () => value)
                .toCompileTo(value as string);
            });
          }
        });
      }
    });

    describe('custom return function should be called with expected arguments and its return value should be rendered in the template', () => {
      it('root decorator', () => {
        expectTemplate('{{*decorator}}world')
          .withInput({ me: 'my' })
          .withDecorator(
            'decorator',
            (fn): TemplateDelegate =>
              (context, options) => {
                expect(context).toMatchInlineSnapshot(`
              Object {
                "me": "my",
              }
            `);
                expect(options).toMatchInlineSnapshot(`
              Object {
                "decorators": Object {
                  "decorator": [Function],
                },
                "helpers": Object {},
                "partials": Object {},
              }
            `);
                return `hello ${context.me} ${fn()}!`;
              }
          )
          .toCompileTo('hello my world!');
      });

      it('decorator nested inside of array-helper', () => {
        expectTemplate('{{#arr}}{{*decorator}}world{{/arr}}')
          .withInput({ arr: ['my'] })
          .withDecorator(
            'decorator',
            (fn): TemplateDelegate =>
              (context, options) => {
                expect(context).toMatchInlineSnapshot(`"my"`);
                expect(options).toMatchInlineSnapshot(`
              Object {
                "blockParams": Array [
                  "my",
                  0,
                ],
                "data": Object {
                  "_parent": Object {
                    "root": Object {
                      "arr": Array [
                        "my",
                      ],
                    },
                  },
                  "first": true,
                  "index": 0,
                  "key": 0,
                  "last": true,
                  "root": Object {
                    "arr": Array [
                      "my",
                    ],
                  },
                },
              }
            `);
                return `hello ${context} ${fn()}!`;
              }
          )
          .toCompileTo('hello my world!');
      });

      it('decorator nested inside of custom helper', () => {
        expectTemplate('{{#helper}}{{*decorator}}world{{/helper}}')
          .withHelper('helper', function (options: HelperOptions) {
            return options.fn('my', { foo: 'bar' } as any);
          })
          .withDecorator(
            'decorator',
            (fn): TemplateDelegate =>
              (context, options) => {
                expect(context).toMatchInlineSnapshot(`"my"`);
                expect(options).toMatchInlineSnapshot(`
              Object {
                "foo": "bar",
              }
            `);
                return `hello ${context} ${fn()}!`;
              }
          )
          .toCompileTo('hello my world!');
      });
    });

    it('should call multiple decorators in the same program body in the expected order and get the expected output', () => {
      let decoratorCall = 0;
      let progCall = 0;
      expectTemplate('{{*decorator}}con{{*decorator}}tent', {
        beforeRender() {
          // ensure the counters are reset between EVAL/AST render calls
          decoratorCall = 0;
          progCall = 0;
        },
      })
        .withInput({
          decoratorCall: 0,
          progCall: 0,
        })
        .withDecorator('decorator', (fn) => {
          const decoratorCallOrder = ++decoratorCall;
          const ret: TemplateDelegate = () => {
            const progCallOrder = ++progCall;
            return `(decorator: ${decoratorCallOrder}, prog: ${progCallOrder}, fn: "${fn()}")`;
          };
          return ret;
        })
        .toCompileTo('(decorator: 2, prog: 1, fn: "(decorator: 1, prog: 2, fn: "content")")');
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
