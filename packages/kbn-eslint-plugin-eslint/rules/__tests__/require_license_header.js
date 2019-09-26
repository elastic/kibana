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

const { RuleTester } = require('eslint');
const rule = require('../require_license_header');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
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
        },
      ],

      output: dedent`
        /* license */

        console.log('foo')
      `,
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
  ],
});
