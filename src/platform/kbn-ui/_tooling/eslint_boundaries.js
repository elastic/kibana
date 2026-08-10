/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Import policy for private packages under `src/platform/kbn-ui/`.
 * Enforced by `@kbn/kbn-ui/no_restricted_package_imports`.
 *
 * Restriction itself comes from `visibility: "private"` in each package's
 * `kibana.jsonc` (scoped to `src/platform/kbn-ui/`). This file only adds:
 *
 * - `alwaysAllowed`: path prefixes that may import any private kbn-ui package
 * - `packages[id].alternative`: what app authors should use instead (lint error)
 * - `packages[id].overrides[]`: extra allowlisted importers beyond `alwaysAllowed`
 *   - `path`: repo-relative prefix
 *   - `reason`: why this override exists (required)
 *
 * Shared packages (`visibility: "shared"`) are unrestricted.
 */
module.exports = {
  alwaysAllowed: ['src/platform/kbn-ui/', 'src/core/'],

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
      alternative: 'Use chrome layout APIs instead.',
      overrides: [
        {
          path: 'src/platform/plugins/shared/developer_toolbar/',
          reason:
            'Needs useLayoutUpdate to set chrome footerHeight; no public core re-export yet. Prefer re-exporting from @kbn/core-chrome-layout (or a chrome API).',
        },
      ],
    },

    '@kbn/ui-chrome-layout-constants': {
      alternative: 'Import from @kbn/core-chrome-layout-constants instead.',
    },

    '@kbn/ui-chrome-layout-utils': {
      alternative: 'Import from @kbn/core-chrome-layout-utils instead.',
    },

    '@kbn/ui-side-navigation': {
      alternative: 'Use chrome navigation APIs instead.',
    },

    '@kbn/ui-storybook-config': {
      alternative: 'Storybook-only config; do not import from Kibana runtime code.',
    },
  },
};
