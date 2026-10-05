/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.require_lazy_zod_schema;
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const EAGER = { messageId: 'eagerZodSchema' };
const DERIVED = { messageId: 'eagerDerivedZodSchema' };

ruleTester.run('@kbn/eslint/require_lazy_zod_schema', rule, {
  valid: [
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        function make() {
          const X = z.object({});
          return X;
        }
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const make = () => {
          const X = z.object({});
          return X;
        };
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        class C {
          make() {
            const X = z.object({});
            return X;
          }
        }
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        {
          const X = z.object({});
        }
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        type T = z.infer<typeof X>;
        const x: z.ZodType = something;
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.lazy(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z } from 'some-other-package';
        export const X = z.object({});
      `,
    },
    {
      code: dedent`
        export const X = z.object({});
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        const useIt = () => Base.extend({});
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Ext = UnknownSchema.extend({ a: z.string() });
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Ext = lazySchema(() => Base.extend({ a: z.string() }));
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Alias = Base;
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const X = z.string().min(1);
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const E = z.enum(['a']);
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import * as z from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z as z4 } from '@kbn/zod/v4';
        export const X = z4.object({});
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z } from 'zod/v4';
        export const X = z.object({});
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.object({}) satisfies z.ZodType;
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.object({}) as z.ZodType;
      `,
      errors: [EAGER],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const A = z.object({}), B = z.string();
      `,
      errors: [EAGER, EAGER],
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Base = lazySchema(() => z.object({}));
        export const Ext = Base.extend({ a: z.string() });
      `,
      errors: [DERIVED],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Base = z.object({});
        export const Opt = Base.optional();
      `,
      errors: [EAGER, DERIVED],
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Arr = Base.array();
      `,
      errors: [DERIVED],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Base = z.object({});
        export const Ext = Base.extend({ a: z.string() });
        export const Picked = Ext.pick({ a: true });
      `,
      errors: [EAGER, DERIVED, DERIVED],
    },
  ],
});
