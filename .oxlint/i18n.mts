/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

// ESLint matched these scopes with `<dir>/**/!(*.stories.tsx|*.test.tsx|...)`. Oxlint globs have no
// extglobs, so those scopes match `<dir>/**/*` and exclude the same file names here.
const STORY_TEST_AND_MOCK_FILES = [
  '**/*.stories.tsx',
  '**/*.test.tsx',
  '**/*.storybook_decorator.tsx',
  '**/*.mock.tsx',
];

export const i18nOverrides: OxlintOverride[] = [
  {
    files: [
      'x-pack/solutions/observability/plugins/**/*',
      'x-pack/solutions/observability/packages/**/*',
      'src/platform/plugins/shared/ai_assistant_management/**/*',
      'x-pack/platform/plugins/shared/streams_app/**/*',
      'src/platform/packages/shared/kbn-unified-chart-section-viewer/**/*',
    ],
    excludeFiles: STORY_TEST_AND_MOCK_FILES,
    rules: {
      '@kbn/i18n/strings_should_be_translated_with_i18n': 'warn',
      '@kbn/i18n/i18n_translate_should_start_with_the_right_id': 'warn',
      '@kbn/i18n/formatted_message_should_start_with_the_right_id': 'warn',
    },
  },
  {
    // Search
    files: ['x-pack/solutions/search/**/*.{ts,tsx}'],
    excludeFiles: ['x-pack/solutions/search/**/*.test.tsx'],
    rules: {
      '@kbn/i18n/strings_should_be_translated_with_i18n': 'warn',
      '@kbn/i18n/strings_should_be_translated_with_formatted_message': 'warn',
    },
  },
  {
    // Visualization team
    files: [
      // src/platform/plugins
      'src/platform/plugins/shared/visualizations',
      'src/platform/plugins/shared/visualization_listing',
      'src/platform/plugins/shared/data',
      'src/platform/plugins/shared/expressions',
      'src/platform/plugins/shared/charts',
      'src/platform/plugins/shared/vis_types/timeseries',
      'src/platform/plugins/shared/chart_expressions',
      'src/platform/plugins/private/vis_types',
      'src/platform/plugins/private/event_annotation',
      'src/platform/plugins/private/event_annotation_listing',
      'src/platform/plugins/private/vis_default_editor',

      // src/platform/packages
      'src/platform/packages/shared/kbn-visualization-listing-components',
      'src/platform/packages/shared/kbn-visualizations-common',
      'src/platform/packages/shared/kbn-visualization-utils',
      'src/platform/packages/shared/kbn-visualization-ui-components',
      'src/platform/packages/shared/kbn-palettes',
      'src/platform/packages/shared/kbn-event-annotation-components',
      'src/platform/packages/shared/kbn-dom-drag-drop',
      'src/platform/packages/shared/kbn-coloring',
      'src/platform/packages/shared/kbn-chart-icons',
      'src/platform/packages/shared/chart-test-jest-helpers',
      'src/platform/packages/private/kbn-test-eui-helpers',

      // x-pack/platform/plugins
      'x-pack/platform/plugins/shared/lens',
      'x-pack/platform/plugins/private/graph',

      // x-pack/platform/packages
      'x-pack/platform/packages/private/kbn-random-sampling',
    ].map((path) => `${path}/**/*`),
    excludeFiles: STORY_TEST_AND_MOCK_FILES,
    rules: {
      '@kbn/i18n/strings_should_be_translated_with_i18n': 'warn',
      '@kbn/i18n/strings_should_be_translated_with_formatted_message': 'warn',
    },
  },
];
