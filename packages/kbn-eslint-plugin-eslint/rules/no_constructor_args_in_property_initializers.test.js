/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_constructor_args_in_property_initializers');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('@kbn/eslint/no_constructor_args_in_property_initializers', rule, {
  valid: [
    {
      code: dedent`
        class Foo {
          bar = 'baz'
        }
      `,
    },
    {
      code: dedent`
        class Foo {
          bar = 'baz'
          constructor(private readonly foo: Box) {}
        }
      `,
    },
    {
      code: dedent`
        class Foo {
          bar = 'baz'
          constructor(private readonly foo: () => void) {}

          get = () => {
            return this.foo()
          }
        }
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        class Foo {
          bar = this.foo.split().reverse()
          constructor(private readonly foo: string) {}
        }
      `,
      errors: [
        {
          line: 2,
          message: `The constructor argument "foo" can't be used in a class property intializer, define the property in the constructor instead`,
        },
      ],
    },
    {
      code: dedent`
        class Foo {
          bar = this.foo()
          constructor(private readonly foo: () => void) {}
        }
      `,
      errors: [
        {
          line: 2,
          message: `The constructor argument "foo" can't be used in a class property intializer, define the property in the constructor instead`,
        },
      ],
    },
    {
      code: dedent`
        class Foo {
          bar = this.foo()
          constructor(private readonly foo: (() => void) = defaultValue) {}
        }
      `,
      errors: [
        {
          line: 2,
          message: `The constructor argument "foo" can't be used in a class property intializer, define the property in the constructor instead`,
        },
      ],
    },
    {
      code: dedent`
        class Foo {
          readonly bar = y(this.deps.history).x(
            () => {
              this.deps.usage()
            }
          );


          constructor(private readonly deps: unknown) {}
        }
      `,
      errors: [
        {
          line: 2,
          message: `The constructor argument "deps" can't be used in a class property intializer, define the property in the constructor instead`,
        },
      ],
    },
  ],
});
