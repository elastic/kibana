/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('..').rules.require_lazy_zod_schema;
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
        import { z } from '@kbn/zod';
        export const meta = z.string().meta();
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const Factory = () => {
          if (process.env.X) {
            return undefined;
          }
          return z.string();
        };
        export const X = Factory().optional();
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const Factory = () => {
          if (process.env.X) {
            return z.string();
          }
        };
        export const X = Factory().optional();
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import * as z from '@kbn/zod';
        export const X = z.lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.object({})).parse({});
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
        const makeSchema = () => z.object({});
        const useSchema = () => makeSchema();
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const parseValue = () => z.string().parse('ok');
        const value = parseValue();
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
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Connector = {
          actions: { checkIp: { input: lazySchema(() => z.object({ ip: z.string() })) } },
          make: () => ({ input: z.object({}) }),
        };
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = z.string().meta({ id: 'x' });
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.string().meta({ id: 'x' }));
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Factory = () => {
          return z.string();
        };
        export const X = Factory().optional();
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Factory = () => {
          return z.string();
        };
        export const X = lazySchema(() => Factory().optional());
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Loose = z.looseObject({ value: z.string() });
        export const Strict = z.strictObject({ value: z.string() });
      `,
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Loose = lazySchema(() => z.looseObject({ value: z.string() }));
        export const Strict = lazySchema(() => z.strictObject({ value: z.string() }));
      `,
      errors: [EAGER, EAGER],
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const createSchema = () => z.object({});
        export const Schema = createSchema();
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const createSchema = () => z.object({});
        export const Schema = lazySchema(() => createSchema());
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const nodeCount = (label) => z.number().describe(label);
        const fields = { min: nodeCount('Minimum').optional() };
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const nodeCount = (label) => z.number().describe(label);
        const fields = { min: lazySchema(() => nodeCount('Minimum').optional()) };
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const createSchema = () => {
          const value = true;
          return z.object({ value: z.boolean().default(value) });
        };
        export const Schema = createSchema();
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const createSchema = () => {
          const value = true;
          return z.object({ value: z.boolean().default(value) });
        };
        export const Schema = lazySchema(() => createSchema());
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod/v4';
        export const Schemas = {
          anything: z.any(),
          website: z.url(),
          choice: z.xor([z.string(), z.number()]),
          pattern: z.string().regex(/x/),
          date: z.string().datetime(),
          hidden: z.string().meta({ hidden: true }),
        };
      `,
      errors: [EAGER, EAGER, EAGER, EAGER, EAGER, EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod/v4';
        export const Schemas = {
          anything: lazySchema(() => z.any()),
          website: lazySchema(() => z.url()),
          choice: lazySchema(() => z.xor([z.string(), z.number()])),
          pattern: lazySchema(() => z.string().regex(/x/)),
          date: lazySchema(() => z.string().datetime()),
          hidden: lazySchema(() => z.string().meta({ hidden: true })),
        };
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const makeSchema = () => z.object({});
        makeSchema();
        makeSchema.describe('schema');
      `,
      errors: [{ messageId: 'schemaFactoryUsedAsSchema' }],
      output: null,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const IpAddressSchema = () => z.union([z.string(), z.number()]);
        export const Connector = { input: z.object({ ip: IpAddressSchema.describe('ip') }) };
      `,
      errors: [{ messageId: 'schemaFactoryUsedAsSchema' }, EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const IpAddressSchema = lazySchema(() => z.union([z.string(), z.number()]));
        export const Connector = { input: lazySchema(() => z.object({ ip: IpAddressSchema.describe('ip') })) };
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z, } from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema, } from '@kbn/zod';
        export const X = lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const lazySchema = () => null;
        export const X = z.object({});
      `,
      errors: [EAGER],
      output: null,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.object({}).parse({});
      `,
      errors: [EAGER],
      output: null,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const X = z.literal(await getValue());
      `,
      parserOptions: { ecmaVersion: 2022 },
      errors: [EAGER],
      output: null,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const A = z.literal(await getValue()), B = z.string();
      `,
      parserOptions: { ecmaVersion: 2022 },
      errors: [EAGER, EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const A = z.literal(await getValue()), B = lazySchema(() => z.string());
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z, lazySchema as deferSchema } from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema as deferSchema } from '@kbn/zod';
        export const X = deferSchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = z.object({}).superRefine(() => {});
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const X = lazySchema(() => z.object({}).superRefine(() => {}));
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Schemas = {
          flag: z.boolean(),
          kind: z.literal('ok'),
          entries: z.record(z.string(), z.number()),
          pair: z.tuple([z.string(), z.number()]),
          choice: z.discriminatedUnion('type', [z.object({ type: z.literal('ok') })]),
          maybe: z.string().nullable(),
          checked: z.string().refine(Boolean),
        };
      `,
      errors: [EAGER, EAGER, EAGER, EAGER, EAGER, EAGER, EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Schemas = {
          flag: lazySchema(() => z.boolean()),
          kind: lazySchema(() => z.literal('ok')),
          entries: lazySchema(() => z.record(z.string(), z.number())),
          pair: lazySchema(() => z.tuple([z.string(), z.number()])),
          choice: lazySchema(() => z.discriminatedUnion('type', [z.object({ type: z.literal('ok') })])),
          maybe: lazySchema(() => z.string().nullable()),
          checked: lazySchema(() => z.string().refine(Boolean)),
        };
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const X = z.string().min(1);
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const X = lazySchema(() => z.string().min(1));
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const E = z.enum(['a']);
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const E = lazySchema(() => z.enum(['a']));
      `,
    },
    {
      code: dedent`
        import * as z from '@kbn/zod';
        export const X = z.object({});
      `,
      errors: [EAGER],
      output: dedent`
        import * as z from '@kbn/zod';
        export const X = z.lazySchema(() => z.object({}));
      `,
    },
    {
      code: dedent`
        import * as schemas from '@kbn/zod';
        export const X = schemas.lazySchema(() => schemas.object({})).optional();
      `,
      errors: [DERIVED],
      output: dedent`
        import * as schemas from '@kbn/zod';
        export const X = schemas.lazySchema(() => schemas.lazySchema(() => schemas.object({})).optional());
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({})).optional().array();
        export const Derived = Base.optional();
      `,
      errors: [DERIVED, DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => lazySchema(() => z.object({})).optional().array());
        export const Derived = lazySchema(() => Base.optional());
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Schemas = { input: lazySchema(() => z.object({})).optional() };
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Schemas = { input: lazySchema(() => lazySchema(() => z.object({})).optional()) };
      `,
    },
    {
      code: dedent`
        import { z as z4 } from '@kbn/zod/v4';
        export const X = z4.object({});
      `,
      errors: [EAGER],
      output: dedent`
        import { z as z4, lazySchema } from '@kbn/zod/v4';
        export const X = lazySchema(() => z4.object({}));
      `,
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
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const A = lazySchema(() => z.object({})), B = lazySchema(() => z.string());
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Ext = UnknownSchema.extend({ a: z.string() });
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Ext = UnknownSchema.extend({ a: lazySchema(() => z.string()) });
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Base = lazySchema(() => z.object({}));
        export const Ext = Base.extend({ a: z.string() });
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Base = lazySchema(() => z.object({}));
        export const Ext = lazySchema(() => Base.extend({ a: z.string() }));
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Base = z.object({});
        export const Opt = Base.optional();
      `,
      errors: [EAGER, DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Base = lazySchema(() => z.object({}));
        export const Opt = lazySchema(() => Base.optional());
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Arr = Base.array();
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Arr = lazySchema(() => Base.array());
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Base = z.object({});
        export const Ext = Base.extend({ a: z.string() });
        export const Picked = Ext.pick({ a: true });
      `,
      errors: [EAGER, DERIVED, DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Base = lazySchema(() => z.object({}));
        export const Ext = lazySchema(() => Base.extend({ a: z.string() }));
        export const Picked = lazySchema(() => Ext.pick({ a: true }));
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        export const Connector = {
          actions: { checkIp: { input: z.object({ ip: z.string() }) } },
        };
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Connector = {
          actions: { checkIp: { input: lazySchema(() => z.object({ ip: z.string() })) } },
        };
      `,
    },
    {
      code: dedent`
        import { z } from '@kbn/zod';
        const Connector = register({ input: z.object({ ip: z.string() }) });
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Connector = register({ input: lazySchema(() => z.object({ ip: z.string() })) });
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Connector = { input: Base.extend({ ip: z.string() }) };
      `,
      errors: [DERIVED],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        const Base = lazySchema(() => z.object({}));
        export const Connector = { input: lazySchema(() => Base.extend({ ip: z.string() })) };
      `,
    },
    {
      code: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Connector = {
          actions: { checkIp: { input: z.object({ ip: z.string() }) } },
        };
      `,
      errors: [EAGER],
      output: dedent`
        import { z, lazySchema } from '@kbn/zod';
        export const Connector = {
          actions: { checkIp: { input: lazySchema(() => z.object({ ip: z.string() })) } },
        };
      `,
    },
  ],
});
