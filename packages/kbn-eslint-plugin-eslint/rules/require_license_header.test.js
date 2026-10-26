/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules['require-license-header'];
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@babel/eslint-parser'),
  parserOptions: {
    ecmaVersion: 2018,
    requireConfigFile: false,
  },
});

ruleTester.run('@kbn/eslint/require-license-header', rule, {
  valid: [
    {
      code: dedent`
        /* license */

        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
    },
    {
      code: dedent`
        // license

        console.log('foo')
      `,

      options: [{ license: '// license' }],
    },

    // jest pragma block-comments may precede the license
    {
      code: dedent`
        /**
         * @jest-environment node
         */

        /* license */

        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
    },
    {
      code: dedent`
        /**
         * @jest-environment node
         * @jest-ignore-pragma
         */
        /* license */

        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
    },
  ],

  invalid: [
    // missing license option
    {
      code: dedent`
        console.log('foo')
      `,

      options: [],
      errors: [
        {
          message: '"license" option is required',
        },
      ],
    },

    // content cannot contain multiple block comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{ license: '/* one *//* two */' }],
      errors: [
        {
          message: '"license" option must only include a single comment',
        },
      ],
    },

    // content cannot contain multiple line comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{ license: `// one\n// two` }],
      errors: [
        {
          message: '"license" option must only include a single comment',
        },
      ],
    },

    // content cannot contain expressions
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          license: dedent`
            /* license */
            console.log('hello world');
          `,
        },
      ],
      errors: [
        {
          message: '"license" option must only include a single comment',
        },
      ],
    },

    // content is not a single comment
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{ license: `console.log('hello world');` }],
      errors: [
        {
          message: '"license" option must only include a single comment',
        },
      ],
    },

    // missing license header
    {
      code: dedent`
        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'File must start with a license header',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 19,
        },
      ],

      output: dedent`
        /* license */

        console.log('foo')
      `,
    },

    // missing license header in a file that starts with an empty line
    {
      code:
        '\n' +
        dedent`
        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'File must start with a license header',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        },
      ],

      output:
        '/* license */\n\n\n' +
        dedent`
        console.log('foo')
      `,
    },

    // keeps shebang files unfixed
    {
      code: `#!/usr/bin/env node
console.log('foo')`,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'File must start with a license header',
        },
      ],

      output: null,
    },

    // strips newlines before the license comment
    {
      code:
        '\n\n' +
        dedent`
        /* license */

        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'License header must be at the very beginning of the file',
        },
      ],

      output: dedent`
        /* license */

        console.log('foo')
      `,
    },

    // moves license header before other nodes if necessary
    {
      code: dedent`
        /* not license */
        /* license */
        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'License header must be at the very beginning of the file',
        },
      ],

      output: dedent`
        /* license */

        /* not license */

        console.log('foo')
      `,
    },

    // a docblock with anything besides jest pragmas is not exempt
    {
      code: dedent`
        /**
         * @jest-environment node
         * Some description
         */

        /* license */

        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'License header must be at the very beginning of the file',
        },
      ],

      output: dedent`
        /* license */

        /**
         * @jest-environment node
         * Some description
         */



        console.log('foo')
      `,
    },

    // inserts a missing license after the pragma so jest keeps reading it
    {
      code: dedent`
        /**
         * @jest-environment node
         */

        console.log('foo')
      `,

      options: [{ license: '/* license */' }],
      errors: [
        {
          message: 'File must start with a license header',
        },
      ],

      output: dedent`
        /**
         * @jest-environment node
         */

        /* license */

        console.log('foo')
      `,
    },
  ],
});
