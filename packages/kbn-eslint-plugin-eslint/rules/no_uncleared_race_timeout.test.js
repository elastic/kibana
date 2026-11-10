/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
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
    {
      code: dedent`
        async function load() {
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                this.timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            clearTimeout(this.timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          let timer;
          const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), 5000);
          });
          function helper() {
            clearTimeout(timer);
          }
          try {
            return await Promise.race([work(), timeout]);
          } finally {
            helper();
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              setTimeout(() => track('still waiting'), 5000);
              abort.addEventListener('abort', () => resolve());
            }),
          ]);
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              const timer = setTimeout(() => resolve(true), 5000);
              done.then(() => clearTimeout(timer));
            }),
          ]);
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          let timer;
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                session.timer = setTimeout(() => resolve(true), 5000);
                timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            clearTimeout(session.timer);
            clearTimeout(timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                this.state.timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            clearTimeout(this.state.timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          let timer;
          const timeout = new Promise((resolve) => {
            timer = global.setTimeout(() => resolve(true), 5000);
          });
          try {
            return await Promise.race([work(), timeout as Promise<boolean>]);
          } finally {
            global.clearTimeout(timer!);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          let timer;
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                timer = (setTimeout(() => resolve(true), 5000));
              }),
            ]);
          } finally {
            clearTimeout(timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              setTimeout(() => {
                const resolve = () => track('local');
                resolve();
              }, 5000);
              abort.addEventListener('abort', () => resolve());
            }),
          ]);
        }
      `,
    },
    {
      code: dedent`
        function load(arms) {
          return Promise.race(arms);
        }
      `,
    },
    {
      code: dedent`
        function load() {
          return custom.race([
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 5000);
            }),
          ]);
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          let timer;
          const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), 5000);
          });
          function helper() {
            if (flag) {
              const timer = unrelated;
            }
            clearTimeout(timer);
          }
          try {
            return await Promise.race([work(), timeout]);
          } finally {
            helper();
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          const state = {};
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                state.timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            clearTimeout(state.timer);
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              const onTimeout = () => track('still waiting');
              setTimeout(onTimeout, 5000);
              abort.addEventListener('abort', () => resolve());
            }),
          ]);
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
    {
      code: dedent`
        async function load() {
          return Promise.race([
            work(),
            new Promise((resolve) => {
              this.timer = setTimeout(() => resolve(true), 5000);
            }),
          ]);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          const timeout = new Promise((resolve) => {
            setTimeout(() => resolve(true), 5000);
          });
          function helper() {
            const timeout = new Promise((resolve) => {
              setTimeout(() => resolve(true), 10);
            });
            return timeout;
          }
          helper();
          return Promise.race([work(), timeout]);
        }
      `,
      errors: [{ messageId: 'uncleared', line: 3 }],
    },
    {
      code: dedent`
        async function load() {
          let timer;
          const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), 5000);
          });
          function helper(timer) {
            clearTimeout(timer);
          }
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
            new Promise((resolve) => {
              setTimeout(resolve, 5000);
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
              setTimeout(() => {
                resolve(true);
              }, 5000);
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
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 1000);
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('timed out')), 2000).ref();
            }),
          ]);
        }
      `,
      errors: [
        { messageId: 'uncleared', line: 4 },
        { messageId: 'uncleared', line: 7 },
      ],
    },
    {
      code: dedent`
        async function load() {
          let timer;
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                timer = setTimeout(() => resolve('first'), 1000);
                setTimeout(() => resolve('second'), 2000);
              }),
            ]);
          } finally {
            clearTimeout(timer);
          }
        }
      `,
      errors: [{ messageId: 'uncleared', line: 8 }],
    },
    {
      code: dedent`
        async function load() {
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                this.timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            clearTimeout(this.other);
          }
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        function load() {
          let timer;
          const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), 5000);
          });
          return Promise.race([work(), timeout]);
        }
        function drop(timer) {
          clearTimeout(timer);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        const load = async () =>
          Promise.race([
            work(),
            new Promise((resolve) => {
              window.setTimeout(() => resolve(true), 5000);
            }),
          ]);
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          const timeout = new Promise((resolve) => {
            setTimeout(() => resolve(true), 5000);
          });
          return Promise.race([work(), timeout!]);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          let timeout = new Promise((resolve) => {
            setTimeout(() => resolve(true), 5000);
          });
          const result = Promise.race([work(), timeout]);
          timeout = new Promise((resolve) => {
            const timer = setTimeout(() => resolve(true), 10);
            clearTimeout(timer);
          });
          return result;
        }
      `,
      errors: [{ messageId: 'uncleared', line: 3 }],
    },
    {
      code: dedent`
        async function load() {
          let timer;
          return Promise.race([
            work(),
            new Promise((resolve) => {
              timer = setTimeout(() => {
                clearTimeout(timer);
                resolve(true);
              }, 5000);
            }),
          ]);
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          let timer;
          const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), 5000);
          });
          function helper() {
            if (flag) {
              const timer = unrelated;
              clearTimeout(timer);
            }
          }
          try {
            return await Promise.race([work(), timeout]);
          } finally {
            helper();
          }
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          const state = {};
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                state.timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            function helper(state) {
              clearTimeout(state.timer);
            }
          }
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          try {
            return await Promise.race([
              work(),
              new Promise((resolve) => {
                this.timer = setTimeout(() => resolve(true), 5000);
              }),
            ]);
          } finally {
            function helper() {
              clearTimeout(this.timer);
            }
          }
        }
      `,
      errors: [error],
    },
    {
      code: dedent`
        async function load() {
          const timeout = new Promise((_, reject) => {
            const onTimeout = () => reject(new Error('timed out'));
            setTimeout(onTimeout, 1000);
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
              setTimeout(onTimeout, 1000);
              function onTimeout() {
                reject(new Error('timed out'));
              }
            }),
          ]);
        }
      `,
      errors: [error],
    },
  ],
});
