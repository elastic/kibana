/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Same shape as the kbn-ui allowlist in `.oxlint/kbn_ui.mts`.
const options = [{ patterns: ['@kbn/*', '!@kbn/i18n', '!@kbn/i18n-react', '!@kbn/ui-callout'] }];

const restricted = (importSource: string) => ({
  messageId: 'patterns',
  data: { importSource },
});

/** Rule test cases, replayed through Oxlint's RuleTester by `__fixtures__/run_rule_tests.mjs`. */
export const portableImportsCases = {
  valid: [
    {
      name: 'packages outside the pattern are allowed',
      code: `
        import { EuiButton } from '@elastic/eui';
        import { css } from '@emotion/react';
        import React from 'react';
        import { helper } from '../helper';
      `,
      options,
    },
    {
      name: 'negated packages are allowed',
      code: `
        import { i18n } from '@kbn/i18n';
        import { FormattedMessage } from '@kbn/i18n-react';
        import { KbnInfoCallout } from '@kbn/ui-callout';
      `,
      options,
    },
    {
      name: 'subpaths of negated packages are allowed',
      code: `import { x } from '@kbn/i18n-react/src/x';`,
      options,
    },
    {
      name: 'nothing is restricted without patterns',
      code: `import { CoreStart } from '@kbn/core/public';`,
    },
  ],
  invalid: [
    {
      name: 'a package matched by the pattern is restricted',
      code: `import { CoreStart } from '@kbn/core';`,
      options,
      errors: [restricted('@kbn/core')],
    },
    {
      name: 'subpaths of a restricted package are restricted',
      code: `import { CoreStart } from '@kbn/core/public';`,
      options,
      errors: [restricted('@kbn/core/public')],
    },
    {
      name: 'a negation only allows the exact package name',
      code: `import { x } from '@kbn/i18n-utils';`,
      options,
      errors: [restricted('@kbn/i18n-utils')],
    },
    {
      name: 'matching is case-insensitive',
      code: `import { CoreStart } from '@KBN/Core';`,
      options,
      errors: [restricted('@KBN/Core')],
    },
    {
      name: 'side-effect imports are restricted',
      code: `import '@kbn/core';`,
      options,
      errors: [restricted('@kbn/core')],
    },
    {
      name: 'type-only imports are restricted',
      code: `
        import type { CoreStart } from '@kbn/core';
        import { type CoreSetup } from '@kbn/core-lifecycle-browser';
      `,
      options,
      errors: [restricted('@kbn/core'), restricted('@kbn/core-lifecycle-browser')],
    },
    {
      name: 'export-from is restricted, type-only included',
      code: `
        export { CoreStart } from '@kbn/core';
        export type { CoreSetup } from '@kbn/core-lifecycle-browser';
        export * from '@kbn/core-http-browser';
        export * as http from '@kbn/core-http-common';
      `,
      options,
      errors: [
        restricted('@kbn/core'),
        restricted('@kbn/core-lifecycle-browser'),
        restricted('@kbn/core-http-browser'),
        restricted('@kbn/core-http-common'),
      ],
    },
    {
      name: 'import-equals requires are restricted, type-only included',
      code: `
        import core = require('@kbn/core');
        import type http = require('@kbn/core-http-browser');
      `,
      options,
      errors: [restricted('@kbn/core'), restricted('@kbn/core-http-browser')],
    },
  ],
};
