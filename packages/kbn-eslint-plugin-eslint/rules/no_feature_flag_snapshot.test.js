/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const dedent = require('dedent');
const rule = require('./no_feature_flag_snapshot');

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

const ERR_FIRST = { messageId: 'featureFlagSnapshot', data: { api: 'firstValueFrom' } };
const ERR_UNSUB = {
  messageId: 'featureFlagSnapshot',
  data: { api: 'subscribe().unsubscribe()' },
};

ruleTester.run('@kbn/eslint/no_feature_flag_snapshot', rule, {
  valid: [
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        featureFlags.getBooleanValue$('flag', false).subscribe((enabled) => {
          register(enabled);
        });
      `,
    },
    {
      filename: '/repo/route.ts',
      code: dedent`
        const enabled = await featureFlags.getBooleanValue('flag', false);
      `,
    },
    {
      filename: '/repo/hook.tsx',
      code: dedent`
        const enabled = useBooleanValue('flag', false);
        const value$ = featureFlags.getBooleanValue$('flag', false);
      `,
    },
    {
      filename: '/repo/other.ts',
      code: dedent`
        const value = await firstValueFrom(license$);
      `,
    },
    {
      filename: '/repo/src/plugin.test.ts',
      code: dedent`
        const enabled = await firstValueFrom(featureFlags.getBooleanValue$('flag', false));
      `,
    },
    {
      filename: '/repo/src/allowed/plugin.ts',
      options: [{ allow: ['src/allowed/plugin.ts'] }],
      code: dedent`
        const enabled = await firstValueFrom(featureFlags.getBooleanValue$('flag', false));
      `,
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const subscription = featureFlags.getBooleanValue$('flag', false).subscribe(update);
        return () => subscription.unsubscribe();
      `,
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        useEffect(() => {
          const subscription = featureFlags.getBooleanValue$('flag', false).subscribe(update);
          return () => subscription.unsubscribe();
        });
      `,
    },
  ],
  invalid: [
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const enabled = await firstValueFrom(featureFlags.getBooleanValue$('flag', false));
      `,
      errors: [ERR_FIRST],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const format = await firstValueFrom(featureFlags.getStringValue$('flag', 'text'));
      `,
      errors: [ERR_FIRST],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const count = await firstValueFrom(featureFlags.getNumberValue$('flag', 1));
      `,
      errors: [ERR_FIRST],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const enabled = await Rx.firstValueFrom(
          core.featureFlags.getBooleanValue$('flag', false)
        );
      `,
      errors: [ERR_FIRST],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const value$ = service.getBooleanValue$(flag.id, flag.fallback);
        return [await firstValueFrom(value$), value$];
      `,
      errors: [ERR_FIRST],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        featureFlags
          .getBooleanValue$('flag', false)
          .subscribe((enabled) => {
            cached = enabled;
          })
          .unsubscribe();
      `,
      errors: [ERR_UNSUB],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const subscription = featureFlags.getBooleanValue$('flag', false).subscribe((enabled) => {
          cached = enabled;
        });
        subscription.unsubscribe();
      `,
      errors: [ERR_UNSUB],
    },
    {
      filename: '/repo/plugin.ts',
      code: dedent`
        const subscription = featureFlags.getBooleanValue$('flag', false).subscribe((enabled) => {
          cached = enabled;
          subscription.unsubscribe();
        });
      `,
      errors: [ERR_UNSUB],
    },
  ],
});
