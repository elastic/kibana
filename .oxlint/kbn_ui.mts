/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

/** Portable `@kbn/ui-*` packages; each follows the allowlist below, so they may import each other. */
const KBN_UI_PACKAGE_IDS = getPackages(REPO_ROOT).flatMap((pkg) =>
  pkg.normalizedRepoRelativeDir.startsWith('src/platform/kbn-ui/') && !pkg.isDevOnly() ? pkg.id : []
);

export const kbnUiRules: DummyRuleMap = {
  '@kbn/kbn-ui/prefer_toast_action_props': 'warn',
  '@kbn/kbn-ui/prefer_kbn_ui_callout': 'warn',
  '@kbn/kbn-ui/no_restricted_package_imports': 'error',
};

export const kbnUiOverrides: OxlintOverride[] = [
  /**
   * Dependency allowlist: kbn-ui packages must be portable outside Kibana
   * (e.g. Cloud UI). They may only import the baseline peer deps
   * (`@elastic/eui`, `@emotion/*`, `react`, `react-dom`), the `@kbn/i18n*`
   * modules stubbed at packaging time, and other kbn-ui packages. Packaging,
   * tests, stories, and Storybook config are excluded because they reference
   * Kibana-only tooling. Uses `@kbn/kbn-ui/portable_imports` rather than
   * `no-restricted-imports` so the repo-wide import restrictions still apply.
   */
  {
    files: ['src/platform/kbn-ui/**/*.{ts,tsx}'],
    excludeFiles: [
      'src/platform/kbn-ui/**/*.test.*',
      'src/platform/kbn-ui/**/*.stories.*',
      'src/platform/kbn-ui/**/__stories__/**',
      'src/platform/kbn-ui/**/__tests__/**',
      'src/platform/kbn-ui/**/packaging/**',
      'src/platform/kbn-ui/storybook-config/**',
      'src/platform/kbn-ui/_tooling/**',
    ],
    rules: {
      '@kbn/kbn-ui/portable_imports': [
        'error',
        {
          patterns: [
            '@kbn/*',
            '!@kbn/i18n',
            '!@kbn/i18n-react',
            ...KBN_UI_PACKAGE_IDS.map((id) => `!${id}`),
          ],
        },
      ],
    },
  },
];
