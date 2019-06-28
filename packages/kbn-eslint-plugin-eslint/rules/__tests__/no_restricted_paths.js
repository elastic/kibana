/* eslint-disable-line @kbn/eslint/require-license-header */
/*
 * This product uses import/no-restricted-paths which is available under a
 * "MIT" license.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-present, Ben Mosher
 * https://github.com/benmosher/eslint-plugin-import
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const path = require('path');
const { RuleTester } = require('eslint');
const rule = require('../no_restricted_paths');

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/no-restricted-paths', rule, {
  valid: [
    {
      code: 'import a from "../client/a.js"',
      filename: path.join(__dirname, './files/no_restricted_paths/server/b.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: 'files/no_restricted_paths/server/**/*',
              from: 'files/no_restricted_paths/other/**/*',
            },
          ],
        },
      ],
    },
    {
      code: 'const a = require("../client/a.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/server/b.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: 'files/no_restricted_paths/server/**/*',
              from: 'files/no_restricted_paths/other/**/*',
            },
          ],
        },
      ],
    },
    {
      code: 'import b from "../server/b.js"',
      filename: path.join(__dirname, './files/no_restricted_paths/client/a.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: '**/no_restricted_paths/client/**/*',
              from: '**/no_restricted_paths/other/**/*',
            },
          ],
        },
      ],
    },

    // irrelevant function calls
    {
      code: 'notrequire("../server/b.js")',
      options: [
        {
          basePath: __dirname,
        },
      ],
    },
    {
      code: 'notrequire("../server/b.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/client/a.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: 'files/no_restricted_paths/client/**/*',
              from: 'files/no_restricted_paths/server/**/*',
            },
          ],
        },
      ],
    },

    // no config
    {
      code: 'require("../server/b.js")',
      options: [
        {
          basePath: __dirname,
        },
      ],
    },
    {
      code: 'import b from "../server/b.js"',
      options: [
        {
          basePath: __dirname,
        },
      ],
    },

    // builtin (ignore)
    {
      code: 'require("os")',
      options: [
        {
          basePath: __dirname,
        },
      ],
    },

    {
      code: 'const d = require("./deep/d.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/server/b.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              allowSameFolder: true,
              target: 'files/no_restricted_paths/**/*',
              from: 'files/no_restricted_paths/**/*',
            },
          ],
        },
      ],
    },
    {
      code: 'const d = require("./deep/d.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/server/b.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              allowSameFolder: true,
              target: 'files/no_restricted_paths/**/*',
              from: ['files/no_restricted_paths/**/*', '!files/no_restricted_paths/server/b*'],
            },
          ],
        },
      ],
    },
  ],

  invalid: [
    {
      code: 'import b from "../server/b.js"',
      filename: path.join(__dirname, './files/no_restricted_paths/client/a.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: 'files/no_restricted_paths/client/**/*',
              from: 'files/no_restricted_paths/server/**/*',
            },
          ],
        },
      ],
      errors: [
        {
          message: 'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    },
    {
      code: 'import a from "../client/a"\nimport c from "./c"',
      filename: path.join(__dirname, './files/no_restricted_paths/server/b.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: 'files/no_restricted_paths/server/**/*',
              from: 'files/no_restricted_paths/client/**/*',
            },
            {
              target: 'files/no_restricted_paths/server/**/*',
              from: 'files/no_restricted_paths/server/c.js',
            },
          ],
        },
      ],
      errors: [
        {
          message: 'Unexpected path "../client/a" imported in restricted zone.',
          line: 1,
          column: 15,
        },
        {
          message: 'Unexpected path "./c" imported in restricted zone.',
          line: 2,
          column: 15,
        },
      ],
    },
    {
      code: 'const b = require("../server/b.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/client/a.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: '**/no_restricted_paths/client/**/*',
              from: '**/no_restricted_paths/server/**/*',
            },
          ],
        },
      ],
      errors: [
        {
          message: 'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 19,
        },
      ],
    },
    {
      code: 'const b = require("../server/b.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/client/a.js'),
      options: [
        {
          basePath: path.join(__dirname, 'files', 'no_restricted_paths'),
          zones: [
            {
              target: 'client/**/*',
              from: 'server/**/*',
            },
          ],
        },
      ],
      errors: [
        {
          message: 'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 19,
        },
      ],
    },

    {
      code: 'const d = require("./deep/d.js")',
      filename: path.join(__dirname, './files/no_restricted_paths/server/b.js'),
      options: [
        {
          basePath: __dirname,
          zones: [
            {
              target: 'files/no_restricted_paths/**/*',
              from: 'files/no_restricted_paths/**/*',
            },
          ],
        },
      ],
      errors: [
        {
          message: 'Unexpected path "./deep/d.js" imported in restricted zone.',
          line: 1,
          column: 19,
        },
      ],
    },
  ],
});
