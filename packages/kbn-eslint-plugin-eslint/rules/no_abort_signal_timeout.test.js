/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('..').rules.no_abort_signal_timeout;
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

const timeoutError = { messageId: 'abortSignalTimeout' };
const undisposedError = { messageId: 'undisposed' };

ruleTester.run('@kbn/eslint/no_abort_signal_timeout', rule, {
  valid: [
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          using signal = timeoutSignal(1000);
          await work(signal);
        }
      `,
    },
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load(passed?: AbortSignal) {
          using deadline = passed ? undefined : timeoutSignal(1000);
          await work(passed ?? deadline);
        }
      `,
    },
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const signal = timeoutSignal(1000);
          try {
            await work(signal);
          } finally {
            signal.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          await fetch(url, { signal: AbortSignal.abort() });
        }
      `,
    },
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        function load(timeout?: number) {
          const deadline = timeout ? timeoutSignal(timeout) : undefined;
          return fetch(url, { signal: deadline }).finally(() => deadline?.dispose());
        }
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        async function load() {
          await fetch(url, { signal: AbortSignal.timeout(2000) });
        }
      `,
      errors: [timeoutError],
      output: dedent`
        import { timeoutSignal } from '@kbn/std';
        async function load() {
          const deadline = timeoutSignal(2000);
          try {
            await fetch(url, { signal: deadline });
          } finally {
            deadline.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        async function load() {
          const signal = AbortSignal.timeout(2000);
          await work(signal);
        }
      `,
      errors: [timeoutError],
      output: dedent`
        import { timeoutSignal } from '@kbn/std';
        async function load() {
          const signal = timeoutSignal(2000);
          try {
            await work(signal);
          } finally {
            signal.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        import { withTimeout } from '@kbn/std';

        async function load() {
          const signal = AbortSignal.timeout(5);
          await work(signal);
        }
      `,
      errors: [timeoutError],
      output: dedent`
        import { withTimeout, timeoutSignal } from '@kbn/std';

        async function load() {
          const signal = timeoutSignal(5);
          try {
            await work(signal);
          } finally {
            signal.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const signal = AbortSignal.timeout(5);
          try {
            await work(signal);
          } finally {
            signal.dispose();
          }
        }
      `,
      errors: [timeoutError],
      output: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const signal = timeoutSignal(5);
          try {
            await work(signal);
          } finally {
            signal.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const [first, second] = await Promise.all([
            fetch(url, { signal: AbortSignal.timeout(1000) }),
            fetch(other, { signal: AbortSignal.timeout(2000) }),
          ]);
          return [first, second];
        }
      `,
      errors: [timeoutError, timeoutError],
      output: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const deadline = timeoutSignal(1000);
          const deadline2 = timeoutSignal(2000);
          try {
            const [first, second] = await Promise.all([
              fetch(url, { signal: deadline }),
              fetch(other, { signal: deadline2 }),
            ]);
            return [first, second];
          } finally {
            deadline.dispose();
            deadline2.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const signal = timeoutSignal(1000);
          await work(signal);
        }
      `,
      errors: [undisposedError],
      output: dedent`
        import { timeoutSignal } from '@kbn/std';

        async function load() {
          const signal = timeoutSignal(1000);
          try {
            await work(signal);
          } finally {
            signal.dispose();
          }
        }
      `,
    },
    {
      code: dedent`
        function load() {
          return AbortSignal.timeout(1000);
        }
      `,
      errors: [timeoutError],
    },
    {
      code: dedent`
        async function load() {
          const signal = AbortSignal.timeout(1000);
          schedule(() => work(signal));
        }
      `,
      errors: [timeoutError],
    },
    {
      code: dedent`
        async function load() {
          foo(AbortSignal.timeout(1000));
        }
      `,
      errors: [timeoutError],
    },
  ],
});
