/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { getPackages } = require('@kbn/repo-packages');
const { REPO_ROOT } = require('@kbn/repo-info');

/** Portable `@kbn/ui-*` packages; each follows the allowlist below, so they may import each other. */
const KBN_UI_PACKAGE_IDS = getPackages(REPO_ROOT).flatMap((pkg) =>
  pkg.normalizedRepoRelativeDir.startsWith('src/platform/kbn-ui/') && !pkg.isDevOnly() ? pkg.id : []
);

module.exports = {
  overrides: [
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
      files: ['**/*.{ts,tsx}'],
      excludedFiles: [
        '**/*.test.*',
        '**/*.stories.*',
        '**/__stories__/**',
        '**/__tests__/**',
        '**/packaging/**',
        'storybook-config/**',
        '_tooling/**',
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
  ],
};
