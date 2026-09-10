/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const { RuleTester } = require('eslint');
const dedent = require('dedent');
const rule = require('./no_eso_registration_dotted_attribute_keys');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: { jsx: false },
  },
});

// Cross-file cases resolve imports relative to this file, so they must be
// linted "as if" they live beside the fixtures.
const FIXTURE_FILE = Path.resolve(__dirname, '__fixtures__/eso_dotted_keys/registration.ts');

const literal = (key, prop) => ({ messageId: 'dottedLiteral', data: { key, prop } });
const ref = (refText, keys, prop) => ({
  messageId: 'dottedRef',
  data: { ref: refText, keys, prop },
});
const spread = (refText, keys, prop) => ({
  messageId: 'dottedSpread',
  data: { ref: refText, keys, prop },
});

ruleTester.run('@kbn/eslint/no_eso_registration_dotted_attribute_keys', rule, {
  valid: [
    // ── flat literals ─────────────────────────────────────────────────────
    {
      code: dedent`
        encryptedSavedObjects.registerType({
          type: 'foo',
          attributesToEncrypt: new Set(['secrets', 'password']),
          attributesToIncludeInAAD: new Set(['name', 'enabled']),
        });
      `,
    },
    {
      code: dedent`
        encryptedSavedObjects.registerType({
          type: 'foo',
          attributesToEncrypt: new Set([{ key: 'secrets' }, { key: 'password' }]),
        });
      `,
    },
    // Dotted string in an unrelated property is not our concern
    {
      code: dedent`
        encryptedSavedObjects.registerType({
          type: 'some.plugin.type',
          attributesToEncrypt: new Set(['password']),
        });
      `,
    },
    // A set that isn't an ESO attribute set is not our concern
    {
      code: dedent`
        const mySet = new Set(['ssl.key', 'password']);
      `,
    },

    // ── same-file references that resolve to flat values ──────────────────
    {
      code: dedent`
        enum ConfigKey {
          ENABLED = 'enabled',
          PASSWORD = 'password',
        }
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([ConfigKey.PASSWORD]),
          attributesToIncludeInAAD: new Set([ConfigKey.ENABLED]),
        };
      `,
    },
    {
      code: dedent`
        const flatKeys = ['password', 'username'];
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set(['secrets', ...flatKeys]),
        };
      `,
    },

    // ── cross-file references that resolve to flat values ─────────────────
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { ConfigKey, flatKeys } from './config_keys';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([ConfigKey.PASSWORD]),
          attributesToIncludeInAAD: new Set([...flatKeys, ConfigKey.NAME]),
        };
      `,
    },
    // Unresolvable import: no value is known, so nothing is reported
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { mysteryKeys } from 'some-untracked-package';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([...mysteryKeys]),
        };
      `,
    },
  ],

  invalid: [
    // ── literals ──────────────────────────────────────────────────────────
    {
      code: dedent`
        encryptedSavedObjects.registerType({
          type: 'foo',
          attributesToEncrypt: new Set(['secrets', 'ssl.key']),
        });
      `,
      errors: [literal('ssl.key', 'attributesToEncrypt')],
    },
    {
      code: dedent`
        encryptedSavedObjects.registerType({
          type: 'foo',
          attributesToEncrypt: new Set(['ssl.key', 'source.inline.script']),
          attributesToIncludeInAAD: new Set(['ssl.certificate']),
        });
      `,
      errors: [
        literal('ssl.key', 'attributesToEncrypt'),
        literal('source.inline.script', 'attributesToEncrypt'),
        literal('ssl.certificate', 'attributesToIncludeInAAD'),
      ],
    },
    // The { key } entry form
    {
      code: dedent`
        encryptedSavedObjects.registerType({
          type: 'foo',
          attributesToEncrypt: new Set([{ key: 'ssl.key' }]),
        });
      `,
      errors: [ref("{ key: 'ssl.key' }", 'ssl.key', 'attributesToEncrypt')],
    },
    // Standalone const declaration
    {
      code: dedent`
        const attributesToEncrypt = new Set(['password', 'ssl.key']);
      `,
      errors: [literal('ssl.key', 'attributesToEncrypt')],
    },

    // ── same-file enum / constant / spread resolution ─────────────────────
    {
      code: dedent`
        enum ConfigKey {
          TLS_KEY = 'ssl.key',
          PASSWORD = 'password',
        }
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([ConfigKey.PASSWORD, ConfigKey.TLS_KEY]),
        };
      `,
      errors: [ref('ConfigKey.TLS_KEY', 'ssl.key', 'attributesToEncrypt')],
    },
    {
      code: dedent`
        enum ConfigKey {
          TLS_KEY = 'ssl.key',
          SOURCE_INLINE = 'source.inline.script',
        }
        const secretKeys = [ConfigKey.TLS_KEY, ConfigKey.SOURCE_INLINE];
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set(['secrets', ...secretKeys]),
        };
      `,
      errors: [spread('secretKeys', 'ssl.key, source.inline.script', 'attributesToEncrypt')],
    },
    // A plain identifier holding a dotted string
    {
      code: dedent`
        const tlsKey = 'ssl.key';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([tlsKey]),
        };
      `,
      errors: [ref('tlsKey', 'ssl.key', 'attributesToEncrypt')],
    },
    // Shorthand property referencing a const declared in the same file
    {
      code: dedent`
        enum ConfigKey {
          TLS_CERTIFICATE = 'ssl.certificate',
        }
        const attributesToIncludeInAAD = new Set([ConfigKey.TLS_CERTIFICATE]);
        const ENCRYPTED = {
          type: 'foo',
          attributesToIncludeInAAD,
        };
      `,
      errors: [ref('ConfigKey.TLS_CERTIFICATE', 'ssl.certificate', 'attributesToIncludeInAAD')],
    },

    // ── cross-file resolution ─────────────────────────────────────────────
    // Enum member imported from another file
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { ConfigKey } from './config_keys';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([ConfigKey.PASSWORD, ConfigKey.TLS_KEY]),
        };
      `,
      errors: [ref('ConfigKey.TLS_KEY', 'ssl.key', 'attributesToEncrypt')],
    },
    // Spread of a constant array imported from another file — the synthetics shape
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { secretKeys } from './config_keys';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set(['secrets', ...secretKeys]),
        };
      `,
      errors: [spread('secretKeys', 'ssl.key, source.inline.script', 'attributesToEncrypt')],
    },
    // Imported Set referenced directly by a shorthand property
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { dottedSet } from './config_keys';
        const ENCRYPTED = {
          type: 'foo',
          attributesToIncludeInAAD: dottedSet,
        };
      `,
      errors: [ref('dottedSet', 'ssl.certificate', 'attributesToIncludeInAAD')],
    },
    // Through a barrel file: `export * from`
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { ConfigKey } from './barrel';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([ConfigKey.SOURCE_INLINE]),
        };
      `,
      errors: [ref('ConfigKey.SOURCE_INLINE', 'source.inline.script', 'attributesToEncrypt')],
    },
    // Through a barrel file: renamed re-export
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import { renamedSecretKeys } from './barrel';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([...renamedSecretKeys]),
        };
      `,
      errors: [spread('renamedSecretKeys', 'ssl.key, source.inline.script', 'attributesToEncrypt')],
    },
    // Namespace import
    {
      filename: FIXTURE_FILE,
      code: dedent`
        import * as Keys from './config_keys';
        const ENCRYPTED = {
          type: 'foo',
          attributesToEncrypt: new Set([...Keys.secretKeys]),
        };
      `,
      errors: [spread('Keys.secretKeys', 'ssl.key, source.inline.script', 'attributesToEncrypt')],
    },
  ],
});
