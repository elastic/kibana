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

// security_solution nav title definition files (hard-coded paths, see rule for rationale).
const SECURITY_TRANSLATIONS_FILE =
  '/x-pack/solutions/security/plugins/security_solution/public/app/translations.ts';
const SECURITY_LINKS_FILE =
  '/x-pack/solutions/security/plugins/security_solution/public/rules/links.ts';

const wrap = (code: string) =>
  `import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';\n${code}`;

const plain = (code: string) => code;

const invalid: RuleTester.InvalidTestCase[] = [
  // Canonical term with wrong casing → brandMismatch (literal + i18n.translate)
  {
    name: 'Canonical term wrong casing (literal) warns with expected form',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'Machine learning' };`),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Machine learning', expected: 'Machine Learning' },
      },
    ],
  },
  {
    name: 'Canonical term wrong casing (i18n.translate) warns with expected form',
    filename: NAV_FILE,
    code: wrap(
      `const node = { title: i18n.translate('foo.nav.inf', { defaultMessage: 'Elastic inference' }) };`
    ),
    errors: [
      {
        messageId: 'brandMismatch',
        data: { message: 'Elastic inference', expected: 'Elastic Inference' },
      },
    ],
  },

  // Management page titles are NOT canonical proper nouns — sentence case applies
  {
    name: 'Former Title Case management label now warns (not a brand proper noun)',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'Index Management' };`),
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
    code: wrap(`const node = { title: 'workflows' };`),
    errors: [
      { messageId: 'capitalizeFirst', data: { message: 'workflows', suggestion: 'Workflows' } },
    ],
  },
  {
    name: 'Lowercase first word (label) warns to capitalise',
    filename: NAV_FILE,
    code: wrap(`const node = { label: 'data views' };`),
    errors: [
      { messageId: 'capitalizeFirst', data: { message: 'data views', suggestion: 'Data views' } },
    ],
  },

  // Sentence case violations on a new (non-glossary) term
  {
    name: 'New Title Case term warns with sentence case suggestion',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'My Custom Section' };`),
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

  // registerApp titles (any file, no core-chrome import) — literal
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
  // Deep link title (any file)
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
  // Title in a navigation-module file (no core-chrome import needed)
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

  // visibleIn containing a sidenav context → still in the sidenav, must be checked
  {
    name: 'deepLink with visibleIn containing classicSideNav warns',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Streams', deepLinks: [{ id: 'y', title: 'My Hidden Page', visibleIn: ['classicSideNav'] }] });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Hidden Page', suggestion: 'My hidden page', word: 'Hidden' },
      },
    ],
  },
  {
    name: 'deepLink with visibleIn containing projectSideNav warns',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Streams', deepLinks: [{ id: 'y', title: 'My Hidden Page', visibleIn: ['globalSearch', 'projectSideNav'] }] });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Hidden Page', suggestion: 'My hidden page', word: 'Hidden' },
      },
    ],
  },

  // Template literal titles are checked
  {
    name: 'template literal title warns',
    filename: NAV_FILE,
    code: wrap('const node = { title: `My Custom Section` };'),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Custom Section', suggestion: 'My custom section', word: 'Custom' },
      },
    ],
  },

  // Same-file const resolution
  {
    name: 'same-file const title warns',
    filename: NAV_FILE,
    code: wrap(`const MY_TITLE = 'My Custom Section'; const node = { title: MY_TITLE };`),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Custom Section', suggestion: 'My custom section', word: 'Custom' },
      },
    ],
  },
  {
    name: 'same-file i18n.translate const title warns',
    filename: NAV_FILE,
    code: wrap(
      `const MY_TITLE = i18n.translate('foo', { defaultMessage: 'My Custom Section' }); const node = { title: MY_TITLE };`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'My Custom Section', suggestion: 'My custom section', word: 'Custom' },
      },
    ],
  },

  // security_solution app/translations.ts — every export is a nav title, all are checked
  {
    name: 'security translations: title-case export warns',
    filename: SECURITY_TRANSLATIONS_FILE,
    code: plain(
      `export const DATA_QUALITY = i18n.translate('xpack.securitySolution.navigation.ecsDataQualityDashboard', { defaultMessage: 'Data Quality' });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: { message: 'Data Quality', suggestion: 'Data quality', word: 'Quality' },
      },
    ],
  },
  {
    name: 'security translations: MITRE coverage warns on Coverage',
    filename: SECURITY_TRANSLATIONS_FILE,
    code: plain(
      `export const COVERAGE_OVERVIEW = i18n.translate('xpack.securitySolution.navigation.coverageOverviewDashboard', { defaultMessage: 'MITRE ATT&CK® Coverage' });`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: {
          message: 'MITRE ATT&CK® Coverage',
          suggestion: 'MITRE ATT&CK® coverage',
          word: 'Coverage',
        },
      },
    ],
  },

  // security_solution links.ts — inline title: i18n.translate is checked
  {
    name: 'security links: title-case inline title warns',
    filename: SECURITY_LINKS_FILE,
    code: plain(
      `const link = { id: 'x', title: i18n.translate('foo', { defaultMessage: 'Uncommon Processes' }), path: '/hosts/uncommon' };`
    ),
    errors: [
      {
        messageId: 'sentenceCase',
        data: {
          message: 'Uncommon Processes',
          suggestion: 'Uncommon processes',
          word: 'Processes',
        },
      },
    ],
  },
];

const valid: RuleTester.ValidTestCase[] = [
  // Canonical / brand terms with exact casing — no warning
  {
    name: 'Canonical term Machine Learning — no warning',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'Machine Learning' };`),
  },
  {
    name: 'Product name Elastic AI SOC Engine — allowed',
    filename: NAV_FILE,
    code: wrap(
      `const node = { title: i18n.translate('foo.nav.soc', { defaultMessage: 'Elastic AI SOC Engine' }) };`
    ),
  },

  // Sentence case — no violation
  {
    name: 'Sentence case title — allowed',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'Data management' };`),
  },
  // Acronyms / mixed-case brand tokens are not plain Title Case — allowed
  {
    name: 'Pure acronym mid-title — allowed',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'Manage API keys' };`),
  },
  {
    name: 'Mixed-case token (OpenAI) mid-title — allowed',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'Manage OpenAI connectors' };`),
  },
  {
    name: 'Lowercase-first mixed-case token (macOS) — allowed',
    filename: NAV_FILE,
    code: wrap(`const node = { title: 'macOS agents' };`),
  },

  // Not a nav title → ignored
  {
    name: 'Non-title property (description) in a nav-tree file — ignored',
    filename: NAV_FILE,
    code: wrap(
      `const node = { description: i18n.translate('foo.desc', { defaultMessage: 'View Custom Stuff' }) };`
    ),
  },
  {
    name: 'Standalone i18n.translate const in a nav-tree file — ignored',
    filename: NAV_FILE,
    code: wrap(
      `const NAV_TITLE = i18n.translate('foo.nav.x', { defaultMessage: 'Some Custom Thing' });`
    ),
  },

  // Out of scope: not a nav file and not a registration context
  {
    name: 'Title literal in a non-nav, non-registration object — ignored',
    filename: PLUGIN_FILE,
    code: plain(`const config = { title: 'Some Arbitrary Title' };`),
  },
  {
    name: 'Non-application register title — ignored',
    filename: PLUGIN_FILE,
    code: plain(`expressions.register({ id: 'x', title: 'Some Expression Thing' });`),
  },
  {
    name: 'application.register title (chromeless/setup apps) — ignored',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Configure Elastic To Get Started', chromeless: true });`
    ),
  },
  // visibleIn without a sidenav context → not a nav item, ignored
  {
    name: 'deepLink with visibleIn: [] — ignored',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Streams', deepLinks: [{ id: 'y', title: 'My Hidden Page', visibleIn: [] }] });`
    ),
  },
  {
    name: 'deepLink with visibleIn: [globalSearch only] — ignored',
    filename: PLUGIN_FILE,
    code: plain(
      `core.application.register({ id: 'x', title: 'Streams', deepLinks: [{ id: 'y', title: 'My Hidden Page', visibleIn: ['globalSearch'] }] });`
    ),
  },
  // Navigation-module file only checks title/label — other strings ignored
  {
    name: 'standalone description const in a nav-module file — ignored',
    filename: NAV_PATH_FILE,
    code: plain(
      `export const CALLOUT = i18n.translate('sec.nav.callout', { defaultMessage: 'Powered by Elastic AI' });`
    ),
  },

  // security_solution app/translations.ts — sentence case titles are allowed
  {
    name: 'security translations: sentence case export — allowed',
    filename: SECURITY_TRANSLATIONS_FILE,
    code: plain(
      `export const HOSTS = i18n.translate('xpack.securitySolution.navigation.hosts', { defaultMessage: 'Hosts' });`
    ),
  },
  {
    name: 'security translations: acronym mid-title export — allowed',
    filename: SECURITY_TRANSLATIONS_FILE,
    code: plain(
      `export const RULES = i18n.translate('xpack.securitySolution.navigation.rules', { defaultMessage: 'Detection rules (SIEM)' });`
    ),
  },

  // Same-file const — correct casing is allowed
  {
    name: 'same-file const with sentence case title — allowed',
    filename: NAV_FILE,
    code: wrap(`const MY_TITLE = 'Data management'; const node = { title: MY_TITLE };`),
  },

  // security_solution links.ts — sentence case title: is allowed, description: is not checked
  {
    name: 'security links: sentence case inline title — allowed',
    filename: SECURITY_LINKS_FILE,
    code: plain(
      `const link = { id: 'x', title: i18n.translate('foo', { defaultMessage: 'All hosts' }), path: '/hosts' };`
    ),
  },
  {
    name: 'security links: description with title case is not checked',
    filename: SECURITY_LINKS_FILE,
    code: plain(
      `const link = { id: 'x', title: i18n.translate('foo', { defaultMessage: 'Hosts' }), description: i18n.translate('bar', { defaultMessage: 'View All Hosts Here' }), path: '/hosts' };`
    ),
  },
];

tsTester[1].run('nav_link_should_use_sentence_case', NavLinkShouldUseSentenceCase, {
  valid,
  invalid,
});
