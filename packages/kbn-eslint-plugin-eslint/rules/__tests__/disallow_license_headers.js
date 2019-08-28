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
const rule = require('../disallow_license_headers');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/disallow-license-headers', rule, {
  valid: [
    {
      code: dedent`
        /* license */

        console.log('foo')
      `,

      options: [
        {
          licenses: ['// license'],
        },
      ],
    },
    {
      code: dedent`
        // license

        console.log('foo')
      `,

      options: [
        {
          licenses: ['/* license */'],
        },
      ],
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
          message: '"licenses" option is required',
        },
      ],
    },

    // license cannot contain multiple block comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: ['/* one *//* two */'],
        },
      ],
      errors: [
        {
          message: '"licenses[0]" option must only include a single comment',
        },
      ],
    },

    // license cannot contain multiple line comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: [`// one\n// two`],
        },
      ],
      errors: [
        {
          message: '"licenses[0]" option must only include a single comment',
        },
      ],
    },

    // license cannot contain expressions
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: [
            '// old license',
            dedent`
            /* license */
            console.log('hello world');
          `,
          ],
        },
      ],
      errors: [
        {
          message: '"licenses[1]" option must only include a single comment',
        },
      ],
    },

    // license is not a single comment
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: ['// old license', '// older license', `console.log('hello world');`],
        },
      ],
      errors: [
        {
          message: '"licenses[2]" option must only include a single comment',
        },
      ],
    },
  ],
});
