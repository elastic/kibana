/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NavLinkShouldUseSentenceCase } from './nav_link_should_use_sentence_case';

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: { sourceType: 'module', ecmaVersion: 2018 },
  }),
] as const;

const NAV_FILE = '/x-pack/solutions/observability/plugins/observability/public/navigation_tree.ts';

const wrap = (code: string) => `import { i18n } from '@kbn/i18n';\n${code}`;

const invalid: RuleTester.InvalidTestCase[] = [
  // Brand term with wrong casing
  {
    name: 'Brand term in wrong casing warns with expected form',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ml', { defaultMessage: 'machine learning' });`),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'machine learning', expected: 'Machine Learning' },
      },
    ],
  },
  {
    name: 'Brand term partially wrong casing',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ml', { defaultMessage: 'Machine learning' });`),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Machine learning', expected: 'Machine Learning' },
      },
    ],
  },

  // Sentence case violation on a new (non-glossary) term
  {
    name: 'New Title Case term warns with sentence case suggestion',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.sec', { defaultMessage: 'My Custom Section' });`),
    errors: [
      {
        messageId: 'sentenceCase',
        data: {
          message: 'My Custom Section',
          suggestion: 'My custom section',
          word: 'Custom',
        },
      },
    ],
  },
  {
    name: 'Multiple Title Case words on a new term',
    filename: NAV_FILE,
    code: wrap(
      `const t = i18n.translate('foo.nav.data', { defaultMessage: 'Data Management Panel' });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: {
          message: 'Data Management Panel',
          suggestion: 'Data management panel',
          word: 'Management',
        },
      },
    ],
  },
];

const valid: RuleTester.ValidTestCase[] = [
  // Brand terms with correct casing — no warning
  {
    name: 'Brand term with exact casing — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ml', { defaultMessage: 'Machine Learning' });`),
  },
  {
    name: 'Brand term AI Assistant — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ai', { defaultMessage: 'AI Assistant' });`),
  },
  {
    name: 'Auto-derived plural AI Assistants — allowed without separate entry',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ai', { defaultMessage: 'AI Assistants' });`),
  },

  // Known (grandfathered) terms — silently accepted regardless of casing conventions
  {
    name: 'Grandfathered term Developer Tools — no warning',
    filename: NAV_FILE,
    code: wrap(
      `const t = i18n.translate('foo.nav.devTools', { defaultMessage: 'Developer Tools' });`
    ),
  },
  {
    name: 'Grandfathered term Stack Management — no warning',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.mgmt', { defaultMessage: 'Stack Management' });`),
  },
  {
    name: 'Grandfathered term Alerts and Insights — no warning',
    filename: NAV_FILE,
    code: wrap(
      `const t = i18n.translate('foo.nav.alerts', { defaultMessage: 'Alerts and Insights' });`
    ),
  },

  // Sentence case — no violation
  {
    name: 'Sentence case new term — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.data', { defaultMessage: 'Data management' });`),
  },

  // Acronyms — always allowed mid-title
  {
    name: 'Pure acronym mid-title — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.api', { defaultMessage: 'Manage API keys' });`),
  },

  // Single word — nothing to check
  {
    name: 'Single word title — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.discover', { defaultMessage: 'Discover' });`),
  },

  // ICU placeholder — skipped
  {
    name: 'ICU placeholder — skipped',
    filename: NAV_FILE,
    code: wrap(
      `const t = i18n.translate('foo.nav.count', { defaultMessage: '{count} Items Found' });`
    ),
  },

  // Non-i18n.translate — ignored
  {
    name: 'Non-i18n.translate call — ignored',
    filename: NAV_FILE,
    code: wrap(`const t = someOtherFn('foo', { defaultMessage: 'Not A Nav Link' });`),
  },
];

for (const [, tester] of [tsTester]) {
  tester.run('nav_link_should_use_sentence_case', NavLinkShouldUseSentenceCase, {
    valid,
    invalid,
  });
}
