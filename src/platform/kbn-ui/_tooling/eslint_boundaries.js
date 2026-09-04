/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Import policy for restricted packages. Enforced by
 * `@kbn/kbn-ui/no_restricted_package_imports`.
 *
 * By default any package may be imported anywhere. Listing a package id under
 * `packages` restricts it.
 *
 * Load-time checks (ESLint fails hard on typos):
 * - each `packages` key must be a real package id
 * - each listed package must have a non-empty `alternative`
 * - `alwaysAllowed` and override `path` values must end with `/` and exist as
 *   directories under the repo root
 * - each override must include a non-empty `reason`
 *
 * Fields:
 * - `alwaysAllowed`: path prefixes that may import any listed package
 * - `packages[id].alternative`: what app authors should use instead (lint error)
 * - `packages[id].overrides[]`: extra allowlisted importers beyond `alwaysAllowed`
 *   - `path`: repo-relative prefix (trailing `/` required)
 *   - `reason`: why this override exists (required)
 */
module.exports = {
  // Cross-imports within kbn-ui only.
  alwaysAllowed: ['src/platform/kbn-ui/'],
  // List of restricted packages and their import policies.
  // Each package must have an `alternative` and may have `overrides`.
  packages: {
    '@kbn/ui-feedback': {
      alternative: 'Use the feedback plugin API instead.',
      overrides: [
        {
          path: 'x-pack/platform/plugins/private/feedback/',
          reason: 'Owning plugin that mounts and owns the feedback UX.',
        },
        {
          path: 'x-pack/platform/packages/private/feedback-registry/',
          reason: 'Registry types/questions are coupled to the feedback UI entry types.',
        },
      ],
    },

    '@kbn/ui-chrome-layout': {
      alternative:
        'See src/core/packages/chrome/layout/README.md for layout CSS variables, sizing, and the application scroll container.',
      overrides: [
        {
          path: 'src/core/packages/chrome/',
          reason: 'Core chrome mounts layout and owns the public chrome facades.',
        },
      ],
    },

    '@kbn/ui-side-navigation': {
      alternative: 'Use chrome navigation APIs instead.',
      overrides: [
        {
          path: 'src/core/packages/chrome/',
          reason: 'Core chrome mounts side navigation and owns navigation APIs.',
        },
      ],
    },

    '@kbn/ui-app-menu': {
      alternative: 'Import from @kbn/app-menu instead.',
      overrides: [
        {
          path: 'src/core/packages/chrome/app-menu/app-menu/',
          reason: 'App-facing contract that re-exports the portable implementation.',
        },
      ],
    },

    '@kbn/ui-app-header': {
      alternative: 'Import from @kbn/app-header instead.',
      overrides: [
        {
          path: 'src/core/packages/chrome/',
          reason:
            'Core chrome re-exports presentation types and owns the connected app-header facade.',
        },
      ],
    },

    '@kbn/ui-storybook-config': {
      alternative: 'Storybook-only config; do not import from Kibana runtime code.',
    },
  },
};
