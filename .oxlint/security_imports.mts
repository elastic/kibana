/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';
import axiosLegacyConsumers from './axios_legacy_consumers.js';

const { AXIOS_LEGACY_CONSUMERS } = axiosLegacyConsumers;

/**
 * Security-related restricted imports. These are enforced by the dedicated
 * `@kbn/eslint/security_imports_restriction` rule so that local
 * `no-restricted-imports` overrides cannot silently drop them.
 */
const SECURITY_RESTRICTED_IMPORTS = [
  {
    name: 'lodash',
    importNames: ['set', 'setWith', 'template'],
    message:
      'lodash.set/setWith: Please use @kbn/safer-lodash-set instead.\n' +
      'lodash.template: Function is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash.set',
    message: 'Please use @kbn/safer-lodash-set/set instead',
  },
  {
    name: 'lodash.setwith',
    message: 'Please use @kbn/safer-lodash-set/setWith instead',
  },
  {
    name: 'lodash/set',
    message: 'Please use @kbn/safer-lodash-set/set instead',
  },
  {
    name: 'lodash/setWith',
    message: 'Please use @kbn/safer-lodash-set/setWith instead',
  },
  {
    name: 'lodash/fp',
    importNames: ['set', 'setWith', 'assoc', 'assocPath', 'template'],
    message:
      'lodash.set/setWith/assoc/assocPath: Please use @kbn/safer-lodash-set/fp instead\n' +
      'lodash.template: Function is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/fp/set',
    message: 'Please use @kbn/safer-lodash-set/fp/set instead',
  },
  {
    name: 'lodash/fp/setWith',
    message: 'Please use @kbn/safer-lodash-set/fp/setWith instead',
  },
  {
    name: 'lodash/fp/assoc',
    message: 'Please use @kbn/safer-lodash-set/fp/assoc instead',
  },
  {
    name: 'lodash/fp/assocPath',
    message: 'Please use @kbn/safer-lodash-set/fp/assocPath instead',
  },
  {
    name: 'lodash.template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'lodash/fp/template',
    message: 'lodash.template is unsafe, and not compatible with our content security policy.',
  },
  {
    name: 'axios',
    message:
      'Do not introduce new axios usage. Use the native `fetch` API instead (available in Node.js 22 and modern browsers). Existing consumers are being migrated incrementally; the allowlist in AXIOS_LEGACY_CONSUMERS will shrink over time.',
  },
];

/** Order matters: the axios allowlist replaces the general options for its files. */
export const securityImportsOverrides: OxlintOverride[] = [
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@kbn/eslint/security_imports_restriction': ['error', ...SECURITY_RESTRICTED_IMPORTS],
    },
  },
  {
    // Allow axios in files that already use it. New axios imports are blocked globally by
    // SECURITY_RESTRICTED_IMPORTS; this allowlist should only ever shrink as consumers migrate
    // to the native `fetch` API.
    files: AXIOS_LEGACY_CONSUMERS,
    rules: {
      '@kbn/eslint/security_imports_restriction': [
        'error',
        ...SECURITY_RESTRICTED_IMPORTS.filter(({ name }) => name !== 'axios'),
      ],
    },
  },
];
