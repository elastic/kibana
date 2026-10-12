/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import { NAKED_DISABLE_MSG_ID } from './no_naked_eslint_disable';

/** Rule test cases, replayed through Oxlint's RuleTester by `__fixtures__/run_rule_tests.mjs`. */
export const noNakedESLintDisableCases = {
  valid: [
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable no-var
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable-next-line no-use-before-define
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable-line no-use-before-define
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        /* eslint-disable no-var */
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        /* eslint-disable no-console, no-control-regex*/
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        alert('foo'); // eslint-disable-line no-alert
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        /* eslint-disable no-alert */
        alert(foo);
        /* eslint-enable no-alert */
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        /* eslint-disable-next-line no-alert */
        alert(foo);
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        alert(foo);/* eslint-disable-line no-alert */
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable-next-line no-console -- logging is intentional
      `,
    },
  ],

  invalid: [
    {
      filename: 'foo.ts',
      code: dedent`
        /* eslint-disable */
        const a = 1;
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: '\nconst a = 1;',
    },
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable-next-line -- no rules named, only a reason
        const a = 1;
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: '\nconst a = 1;',
    },
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable-next-line
        const a = 1;
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: `\nconst a = 1;`,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        /* eslint-disable */
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: '',
    },
    {
      filename: 'foo.ts',
      code: dedent`
        // eslint-disable-next-line
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: '',
    },
    {
      filename: 'foo.ts',
      code: dedent`
        alert('foo');// eslint-disable-line
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: `alert('foo');`,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        /* eslint-disable */
        alert(foo);
        /* eslint-enable */
        bar += 'r';
      `,
      errors: [
        {
          line: 3,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: dedent`
        const foo = 'foo';
        let bar = 'ba';

        alert(foo);
        /* eslint-enable */
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        /* eslint-disable */
        alert(foo);
        bar += 'r';
      `,
      errors: [
        {
          line: 3,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: dedent`
        const foo = 'foo';
        let bar = 'ba';

        alert(foo);
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        /* eslint-disable-next-line */
        alert(foo);
        bar += 'r';
      `,
      errors: [
        {
          line: 3,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: dedent`
        const foo = 'foo';
        let bar = 'ba';

        alert(foo);
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        const foo = 'foo';
        let bar = 'ba';
        alert(foo);/* eslint-disable-line */
        bar += 'r';
      `,
      errors: [
        {
          line: 3,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: dedent`
        const foo = 'foo';
        let bar = 'ba';
        alert(foo);
        bar += 'r';
      `,
    },
    {
      filename: 'foo.ts',
      code: dedent`
        /* oxlint-disable */
        const a = 1;
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: '\nconst a = 1;',
    },
    {
      filename: 'foo.ts',
      code: dedent`
        alert('foo'); // oxlint-disable-line
      `,
      errors: [
        {
          line: 1,
          messageId: NAKED_DISABLE_MSG_ID,
        },
      ],
      output: `alert('foo'); `,
    },
  ],
};
