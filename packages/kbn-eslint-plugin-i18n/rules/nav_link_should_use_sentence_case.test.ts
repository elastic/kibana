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

// A file that does NOT import @kbn/core-chrome-browser — used to prove that
// registration / deep-link titles are detected by AST context alone.
const PLUGIN_FILE = '/x-pack/platform/plugins/shared/some_plugin/public/plugin.ts';

// A file inside a navigation module — checked in full without the import.
const NAV_PATH_FILE = '/x-pack/solutions/security/packages/navigation/src/i18n_strings.ts';

const wrap = (code: string) =>
  `import { i18n } from '@kbn/i18n';\nimport type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';\n${code}`;

const plain = (code: string) => `import { i18n } from '@kbn/i18n';\n${code}`;

const invalid: RuleTester.InvalidTestCase[] = [
  // Canonical term with wrong casing → brandMismatch
  {
    name: 'Brand term partially wrong casing',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.inf', { defaultMessage: 'Elastic inference' });`),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Elastic inference', expected: 'Elastic Inference' },
      },
    ],
  },
  {
    name: 'Machine learning wrong casing warns with expected form',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ml', { defaultMessage: 'Machine learning' });`),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Machine learning', expected: 'Machine Learning' },
      },
    ],
  },

  // Management page titles are NOT canonical proper nouns — sentence case applies
  {
    name: 'Former Title Case management label now warns (not a brand proper noun)',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.idx', { defaultMessage: 'Index Management' });`),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'Index Management', suggestion: 'Index management', word: 'Management' },
      },
    ],
  },

  // First word must be capitalised
  {
    name: 'Lowercase single-word title warns to capitalise',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.wf', { defaultMessage: 'workflows' });`),
    errors: [
      { messageId: 'capitalizeFirst', data: { message: 'workflows', suggestion: 'Workflows' } },
    ],
  },
  {
    name: 'Lowercase first word warns to capitalise',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.dv', { defaultMessage: 'data views' });`),
    errors: [
      { messageId: 'capitalizeFirst', data: { message: 'data views', suggestion: 'Data views' } },
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

  // Management section registration in a file WITHOUT the core-chrome import
  {
    name: 'registerApp title literal in a plugin file warns',
    filename: PLUGIN_FILE,
    code: plain(
      `management.sections.section.data.registerApp({ id: 'x', title: 'My Custom Section' });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Custom Section', suggestion: 'My custom section', word: 'Custom' },
      },
    ],
  },
  {
    name: 'registerApp title wrapping i18n.translate in a plugin file warns',
    filename: PLUGIN_FILE,
    code: plain(
      `management.sections.section.data.registerApp({ id: 'x', title: i18n.translate('foo.mon', { defaultMessage: 'Stack monitoring' }) });`
    ),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Stack monitoring', expected: 'Stack Monitoring' },
      },
    ],
  },
  // Deep link title in a file WITHOUT the core-chrome import
  {
    name: 'deepLinks title in a plugin file warns',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Streams', deepLinks: [{ id: 'y', title: 'My Deep Link' }] });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Deep Link', suggestion: 'My deep link', word: 'Deep' },
      },
    ],
  },
  // A title in a nav-module file is checked even without the core-chrome import
  {
    name: 'title in a navigation-module file warns',
    filename: NAV_PATH_FILE,
    code: plain(
      `export const s = { ml: { title: i18n.translate('sec.nav.ml', { defaultMessage: 'Machine learning' }) } };`
    ),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Machine learning', expected: 'Machine Learning' },
      },
    ],
  },
  // title wrapping i18n.translate inside a core-chrome nav tree is still checked
  {
    name: 'title wrapping i18n.translate in a nav-tree file warns',
    filename: NAV_FILE,
    code: wrap(
      `const node = { title: i18n.translate('foo.nav.sec', { defaultMessage: 'My Custom Section' }) };`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Custom Section', suggestion: 'My custom section', word: 'Custom' },
      },
    ],
  },
  {
    name: 'label wrapping i18n.translate in a nav-tree file warns',
    filename: NAV_FILE,
    code: wrap(
      `const node = { label: i18n.translate('foo.nav.sec', { defaultMessage: 'My Custom Section' }) };`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Custom Section', suggestion: 'My custom section', word: 'Custom' },
      },
    ],
  },
];

const valid: RuleTester.ValidTestCase[] = [
  // Brand/canonical terms with correct casing — no warning
  {
    name: 'Product name Elastic AI SOC Engine — allowed',
    filename: NAV_FILE,
    code: wrap(
      `const t = i18n.translate('foo.nav.soc', { defaultMessage: 'Elastic AI SOC Engine' });`
    ),
  },
  // Hidden deep link (visibleIn: []) is not a nav item — ignored
  {
    name: 'deepLink title with visibleIn: [] — ignored',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Streams', deepLinks: [{ id: 'y', title: 'My Hidden Page', visibleIn: [] }] });`
    ),
  },

  // Canonical term with exact casing — no warning
  {
    name: 'Canonical term Stack Monitoring — no warning',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.mon', { defaultMessage: 'Stack Monitoring' });`),
  },

  // Sentence case — no violation
  {
    name: 'Sentence case new term — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.data', { defaultMessage: 'Data management' });`),
  },
  {
    name: 'Sentence case label in a nav-tree object — allowed',
    filename: NAV_FILE,
    code: wrap(
      `const node = { label: i18n.translate('foo.nav.data', { defaultMessage: 'Data management' }) };`
    ),
  },
  {
    name: 'Machine Learning Kibana app title — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.ml', { defaultMessage: 'Machine Learning' });`),
  },
  // Acronyms — always allowed mid-title
  {
    name: 'Pure acronym mid-title — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.api', { defaultMessage: 'Manage API keys' });`),
  },
  // Mixed-case brand token mid-title is not plain Title Case — allowed
  {
    name: 'Mixed-case token (OpenAI) mid-title — allowed',
    filename: NAV_FILE,
    code: wrap(
      `const t = i18n.translate('foo.nav.oai', { defaultMessage: 'Manage OpenAI connectors' });`
    ),
  },
  // Lowercase-first token that is a legit mixed-case/symbol brand — allowed
  {
    name: 'Lowercase-first mixed-case token (macOS) — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.mac', { defaultMessage: 'macOS agents' });`),
  },
  // Non-title property value (description) in a nav-tree file — ignored
  {
    name: 'description property (i18n.translate) in a nav-tree file — ignored',
    filename: NAV_FILE,
    code: wrap(
      `const x = { description: i18n.translate('foo.desc', { defaultMessage: 'View Custom Stuff' }) };`
    ),
  },

  // Single word — nothing to check
  {
    name: 'Single word title — allowed',
    filename: NAV_FILE,
    code: wrap(`const t = i18n.translate('foo.nav.discover', { defaultMessage: 'Discover' });`),
  },

  // Non-i18n.translate — ignored
  {
    name: 'Non-i18n.translate call — ignored',
    filename: NAV_FILE,
    code: wrap(`const t = someOtherFn('foo', { defaultMessage: 'Not A Nav Link' });`),
  },

  // A title/label outside a nav file and outside a registration context is ignored
  {
    name: 'Title literal in a non-nav, non-registration object — ignored',
    filename: PLUGIN_FILE,
    code: plain(`const config = { title: 'Some Arbitrary Title' };`),
  },
  {
    name: 'i18n.translate outside a nav file and registration — ignored',
    filename: PLUGIN_FILE,
    code: plain(`const t = i18n.translate('foo.button', { defaultMessage: 'Create New Thing' });`),
  },
  // A non-application .register(...) is not treated as a nav registration
  {
    name: 'Non-application register title — ignored',
    filename: PLUGIN_FILE,
    code: plain(`expressions.register({ id: 'x', title: 'Some Expression Thing' });`),
  },
  // A bare application.register title is the app title, not a nav item — ignored
  {
    name: 'application.register title (chromeless/setup apps) — ignored',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Configure Elastic To Get Started', chromeless: true });`
    ),
  },
  // Correct casing in registration contexts — allowed
  {
    name: 'registerApp canonical title — allowed',
    filename: PLUGIN_FILE,
    code: plain(
      `management.sections.section.data.registerApp({ id: 'x', title: i18n.translate('foo.mon', { defaultMessage: 'Stack Monitoring' }) });`
    ),
  },
  // Descriptions / callouts / aria labels in a nav-module file are NOT titles
  {
    name: 'standalone description const in a nav-module file — ignored',
    filename: NAV_PATH_FILE,
    code: plain(
      `export const CALLOUT = i18n.translate('sec.nav.callout', { defaultMessage: 'Powered by Elastic AI' });`
    ),
  },
];

for (const [, tester] of [tsTester]) {
  tester.run('nav_link_should_use_sentence_case', NavLinkShouldUseSentenceCase, {
    valid,
    invalid,
  });
}
