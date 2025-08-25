/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_animation_without_euiCanAnimate');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@babel/eslint-parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    requireConfigFile: false,
  },
});

ruleTester.run('@kbn/eslint/no-animation-without-euiCanAnimate', rule, {
  valid: [
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css({
          [euiCanAnimate]: {
            animation: 'my-animation 1s',
          },
        });
      `,
    },
    {
      code: dedent`
        import styled from '@emotion/styled';
        import { euiCanAnimate } from '../../../../animation';

        const MyComponent = styled.div({
          [euiCanAnimate]: {
            transition: 'all 1s',
          },
        });
      `,
    },
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css\`
          \${euiCanAnimate} {
            animation: my-animation 1s;
          }
        \`;
      `,
    },
    {
      code: dedent`
        import styled from '@emotion/styled';
        import { euiCanAnimate } from '../../../../animation';

        const MyComponent = styled.div\`
          \${euiCanAnimate} {
            transition: all 1s;
          }
        \`;
      `,
    },
    {
      code: dedent`
        import { css } from '@emotion/react';

        const styles = css\`
          animation: none;
        \`;
      `,
    },
    {
      code: dedent`
        import { css } from '@emotion/react';

        const styles = css\`
          color: 'red';
          opacity: 1;
        \`;
      `,
    },
    {
      code: dedent`
        import { css, keyframes } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const myAnimation = keyframes\`
          from { opacity: 0; }
          to { opacity: 1; }
        \`;

        const styles = css\`
          \${euiCanAnimate} {
            animation-name: \${myAnimation};
          }
        \`;
      `,
    },
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css\`
          opacity: 1;
          \${euiCanAnimate} {
            transition: opacity 1s;
          }
        \`;
      `,
    },
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css({
          opacity: 1,
          [euiCanAnimate]: {
            transition: 'opacity 1s',
          },
        });
      `,
    },
    {
      code: dedent`
        import { euiCanAnimate } from '../../../../animation';
        const styles = {
          opacity: 1,
          [euiCanAnimate]: {
            transition: 'opacity 1s',
          },
        };
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        import { css } from '@emotion/react';

        const styles = css({
          animation: 'my-animation 1s',
        });
      `,
      errors: [{ message: 'CSS animation property should be wrapped in euiCanAnimate check.' }],
    },
    {
      code: dedent`
        import styled from '@emotion/styled';

        const MyComponent = styled.div({
          transition: 'all 1s',
        });
      `,
      errors: [{ message: 'CSS animation property should be wrapped in euiCanAnimate check.' }],
    },
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css\`
          \${euiCanAnimate} {
            transition: opacity 1s;
          }
        \`;
      `,
      errors: [
        {
          message:
            'The animated property [opacity] needs a fallback value when animations are disabled.',
        },
      ],
    },
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css({
          [euiCanAnimate]: {
            transition: 'opacity 1s',
          },
        });
      `,
      errors: [
        {
          message:
            'The animated property [opacity] needs a fallback value when animations are disabled.',
        },
      ],
    },
    {
      code: dedent`
        import { css } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const styles = css\`
          position: absolute;
          top: -9999px;
          \${euiCanAnimate} {
            transition: top 1s;
          }
        \`;
      `,
      errors: [
        {
          message:
            'The property [top] is animated, but the default value makes the element inaccessible when animations are disabled.',
        },
      ],
    },
    {
      code: dedent`
        import { css, keyframes } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const myAnimation = keyframes\`
          from { top: -1000px; }
          to { top: 0; }
        \`;

        const styles = css\`
          position: absolute;
          \${euiCanAnimate} {
            animation-name: \${myAnimation};
          }
        \`;
      `,
      errors: [
        {
          message:
            'The animated property [top] needs a fallback value when animations are disabled.',
        },
      ],
    },
    {
      code: dedent`
        import { css, keyframes } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const myAnimation = keyframes\`
          from { top: -1000px; }
          to { top: 0; }
        \`;

        const styles = css\`
          position: absolute;
          \${euiCanAnimate} {
            animation-name: \${myAnimation};
          }
        \`;
      `,
      errors: [
        {
          message:
            'The property [top] is animated, but the default value makes the element inaccessible when animations are disabled.',
        },
      ],
    },
    {
      code: dedent`
        import { keyframes } from '@emotion/react';
        import { euiCanAnimate } from '../../../../animation';

        const myAnimation = keyframes\`
          from { opacity: 0; }
          to { opacity: 1; }
        \`;

        const styles = {
          [euiCanAnimate]: {
            animationName: myAnimation,
          },
        };
      `,
      errors: [
        {
          message:
            'The animated property [opacity] needs a fallback value when animations are disabled.',
        },
      ],
    },
  ],
});
