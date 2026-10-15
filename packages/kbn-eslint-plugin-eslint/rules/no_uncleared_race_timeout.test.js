/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('..').rules.no_uncleared_race_timeout;
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

const error = { messageId: 'uncleared' };

ruleTester.run('@kbn/eslint/no_uncleared_race_timeout', rule, {
  valid: [
    {
      code: dedent`
        async function load() {
          let timeout;
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                timeout = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            clearTimeout(timeout);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), 5000);
          });
          try {
            return await Promise.race([work(), timeout]);
          } finally {
            clearTimeout(timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          let timer;
          const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('timed out')), 1000).unref();
          });
          try {
            return await Promise.race([work(), timeout]);
          } finally {
            clearTimeout(timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([work(), abortSignal]);
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          const result = await Promise.race([
            (async () => {
              await new Promise((resolve) => setTimeout(resolve, 10));
              return work();
            })(),
            shutdown,
          ]);
          return result;
        }
      `,
    },
    {
      code: dedent`
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 5000);
            }),
          ]);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timed out')), 1000);
          });
          return Promise.race([work(), timeout]);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('timed out')), 1000).unref();
            }),
          ]);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              global.setTimeout(() => resolve(true), 5000);
            }),
          ]);
        }
      `,
      errors: [error],
    },
  ],
});
