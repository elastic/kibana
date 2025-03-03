/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_async_promise_body');
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

ruleTester.run('@kbn/eslint/no_async_promise_body', rule, {
  valid: [
    // caught but no resolve
    {
      code: dedent`
        new Promise(async function (resolve) {
          try {
            await asyncOperation();
          } catch (error) {
            // noop
          }
        })
      `,
    },
    // arrow caught but no resolve
    {
      code: dedent`
        new Promise(async (resolve) => {
          try {
            await asyncOperation();
          } catch (error) {
            // noop
          }
        })
      `,
    },
    // caught with reject
    {
      code: dedent`
        new Promise(async function (resolve, reject) {
          try {
            await asyncOperation();
          } catch (error) {
            reject(error)
          }
        })
      `,
    },
    // arrow caught with reject
    {
      code: dedent`
        new Promise(async (resolve, reject) => {
          try {
            await asyncOperation();
          } catch (error) {
            reject(error)
          }
        })
      `,
    },
    // non async
    {
      code: dedent`
        new Promise(function (resolve) {
          setTimeout(resolve, 10);
        })
      `,
    },
    // arrow non async
    {
      code: dedent`
        new Promise((resolve) => setTimeout(resolve, 10))
      `,
    },
  ],

  invalid: [
    // no catch
    {
      code: dedent`
        new Promise(async function (resolve) {
          const result = await asyncOperation();
          resolve(result);
        })
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections',
        },
      ],
      output: dedent`
        new Promise(async function (resolve, reject) {
          try {
            const result = await asyncOperation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      `,
    },
    // arrow no catch
    {
      code: dedent`
        new Promise(async (resolve) => {
          const result = await asyncOperation();
          resolve(result);
        })
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections',
        },
      ],
      output: dedent`
        new Promise(async (resolve, reject) => {
          try {
            const result = await asyncOperation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      `,
    },
    // catch, but it throws
    {
      code: dedent`
        new Promise(async function (resolve) {
          try {
            const result = await asyncOperation();
            resolve(result);
          } catch (error) {
            if (error.code === 'foo') {
              throw error;
            }
          }
        })
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections',
        },
      ],
      output: dedent`
        new Promise(async function (resolve, reject) {
          try {
            try {
              const result = await asyncOperation();
              resolve(result);
            } catch (error) {
              if (error.code === 'foo') {
                throw error;
              }
            }
          } catch (error) {
            reject(error);
          }
        })
      `,
    },
    // no catch without block
    {
      code: dedent`
        new Promise(async (resolve) => resolve(await asyncOperation()));
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections',
        },
      ],
      output: dedent`
        new Promise(async (resolve, reject) => {
          try {
            return resolve(await asyncOperation());
          } catch (error) {
            reject(error);
          }
        });
      `,
    },
    // no catch with named reject
    {
      code: dedent`
        new Promise(async (resolve, rej) => {
          const result = await asyncOperation();
          result ? resolve(true) : rej()
        });
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections',
        },
      ],
      output: dedent`
        new Promise(async (resolve, rej) => {
          try {
            const result = await asyncOperation();
            result ? resolve(true) : rej();
          } catch (error) {
            rej(error);
          }
        });
      `,
    },
    // no catch with no args
    {
      code: dedent`
        new Promise(async () => {
          await asyncOperation();
        });
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to the Promise constructor leads to a hidden promise being created and prevents handling rejections',
        },
      ],
      output: dedent`
        new Promise(async (resolve, reject) => {
          try {
            await asyncOperation();
          } catch (error) {
            reject(error);
          }
        });
      `,
    },
  ],
});
