/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./require_di_token_naming');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/require_di_token_naming', rule, {
  valid: [
    {
      code: dedent`
        const MyToken = Symbol.for('myPlugin.MyService') as ServiceIdentifier<IMyService>;
      `,
    },
    {
      code: dedent`
        const Token = Symbol.for('slo.CreateSLOFormFlyout') as ServiceIdentifier<any>;
      `,
    },
    {
      code: dedent`
        import { createTokenFactory } from '@kbn/plugin-di';
        const myPlugin = createTokenFactory('myPlugin');
        const Token = myPlugin.service<any>('MyService');
      `,
    },
    {
      code: dedent`
        import { createTokenFactory as defineTokenFactory } from '@kbn/plugin-di';
        const slo = defineTokenFactory('slo');
        const Token = slo.service<any>('SLODetailsFlyout');
      `,
    },
    {
      code: dedent`
        import { createTokenFactory as defineTokenFactory } from '@kbn/plugin-di';
        const Token = defineTokenFactory('slo').service<any>('SLODetailsFlyout');
      `,
    },
    {
      code: dedent`
        import * as tokenFactoryNs from '@kbn/plugin-di';
        const myPlugin = tokenFactoryNs.createTokenFactory('myPlugin');
        const Token = myPlugin.service<any>('MyService');
      `,
    },
    {
      code: dedent`
        import { createTokenFactory } from '@kbn/plugin-di';
        const embeddable = createTokenFactory('embeddable');
        const Token = embeddable.extensionPoint<any>('FactoryRegistration');
      `,
    },
    {
      code: dedent`
        import * as tokenFactoryNs from '@kbn/plugin-di';
        const Token = tokenFactoryNs
          .createTokenFactory('embeddable')
          .extensionPoint<any>('FactoryRegistration');
      `,
    },
    {
      code: dedent`
        const Global = Symbol.for('Global') as ServiceIdentifier<ServiceIdentifier>;
      `,
    },
    {
      code: dedent`
        const Setup = Symbol.for('Setup') as ServiceIdentifier;
      `,
    },
    {
      code: dedent`
        const Start = Symbol.for('Start') as ServiceIdentifier;
      `,
    },
    {
      code: dedent`
        const OnSetup = Symbol.for('OnSetup') as ServiceIdentifier;
      `,
    },
    {
      code: dedent`
        const OnStart = Symbol.for('OnStart') as ServiceIdentifier;
      `,
    },
    {
      code: dedent`
        const SetupToken = Symbol.for('plugin.setup.myPlugin') as ServiceIdentifier;
      `,
    },
    {
      code: dedent`
        const StartToken = Symbol.for('plugin.start.myPlugin') as ServiceIdentifier;
      `,
    },
    {
      code: dedent`
        // Not cast as ServiceIdentifier, so the rule does not apply.
        const unrelated = Symbol.for('whatever');
      `,
    },
    {
      code: dedent`
        // Cast to a different type, not ServiceIdentifier.
        const other = Symbol.for('anything') as symbol;
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        const Bad = Symbol.for('bad_name') as ServiceIdentifier<any>;
      `,
      errors: [
        {
          messageId: 'badTokenName',
          data: { value: 'bad_name' },
        },
      ],
    },
    {
      code: dedent`
        const Bad = Symbol.for('di.example.AlphaService') as ServiceIdentifier<IAlphaService>;
      `,
      errors: [
        {
          messageId: 'badTokenName',
          data: { value: 'di.example.AlphaService' },
        },
      ],
    },
    {
      code: dedent`
        const Bad = Symbol.for('NoPluginId') as ServiceIdentifier<any>;
      `,
      errors: [
        {
          messageId: 'badTokenName',
          data: { value: 'NoPluginId' },
        },
      ],
    },
    {
      code: dedent`
        const Bad = Symbol.for('myPlugin.lowercase') as ServiceIdentifier<any>;
      `,
      errors: [
        {
          messageId: 'badTokenName',
          data: { value: 'myPlugin.lowercase' },
        },
      ],
    },
    {
      code: dedent`
        import { createTokenFactory } from '@kbn/plugin-di';
        const myPlugin = createTokenFactory('myPlugin');
        const Bad = myPlugin.service<any>('bad_name');
      `,
      errors: [
        {
          messageId: 'badLocalName',
          data: { value: 'bad_name' },
        },
      ],
    },
    {
      code: dedent`
        import { createTokenFactory as defineTokenFactory } from '@kbn/plugin-di';
        const embeddable = defineTokenFactory('embeddable');
        const Bad = embeddable.extensionPoint<any>('myPlugin.lowercase');
      `,
      errors: [
        {
          messageId: 'badLocalName',
          data: { value: 'myPlugin.lowercase' },
        },
      ],
    },
    {
      code: dedent`
        import * as tokenFactoryNs from '@kbn/plugin-di';
        const Plugin = tokenFactoryNs.createTokenFactory('BadPlugin');
        const Bad = Plugin.service<any>('MyService');
      `,
      errors: [
        {
          messageId: 'badPluginId',
          data: { value: 'BadPlugin' },
        },
      ],
    },
    {
      code: dedent`
        import { createTokenFactory } from '@kbn/plugin-di';
        const Bad = createTokenFactory('BadPlugin').service<any>('MyService');
      `,
      errors: [
        {
          messageId: 'badPluginId',
          data: { value: 'BadPlugin' },
        },
      ],
    },
    {
      code: dedent`
        import { createTokenFactory as defineTokenFactory } from '@kbn/plugin-di';
        const Bad = defineTokenFactory('slo').service<any>('bad_name');
      `,
      errors: [
        {
          messageId: 'badLocalName',
          data: { value: 'bad_name' },
        },
      ],
    },
  ],
});
