/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

/** Order matters: Serverless Search raises the Search severity for its own files. */
export const telemetryOverrides: OxlintOverride[] = [
  {
    files: [
      'x-pack/platform/plugins/shared/aiops/**/*.tsx',
      'x-pack/platform/plugins/shared/observability_solution/**/*.{ts,tsx}',
      'x-pack/solutions/observability/plugins/**/*.{ts,tsx}',
      'src/platform/plugins/shared/ai_assistant_management/**/*.tsx',
      'x-pack/solutions/observability/packages/**/*.{ts,tsx}',
    ],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'error',
    },
  },
  {
    files: [
      'x-pack/solutions/search/**/*.tsx',
      'x-pack/platform/plugins/shared/content_connectors/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/search_inference_endpoints/**/*.{ts,tsx}',
    ],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'warn',
    },
  },
  {
    // Enterprise Search
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'warn',
    },
  },
  {
    // Serverless Search
    files: [
      'x-pack/solutions/search/plugins/serverless_search/**/*.{ts,tsx}',
      'x-pack/solutions/search/packages/kbn-search-*',
    ],
    rules: {
      '@kbn/telemetry/event_generating_elements_should_be_instrumented': 'error',
    },
  },
  {
    files: [
      'x-pack/solutions/observability/plugins/**/*.{ts,tsx}',
      'x-pack/solutions/observability/packages/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-apm-ui-shared/**/*.{ts,tsx}',
    ],
    excludeFiles: ['**/*.test.*', '**/*.stories.*', '**/*.mock.*', '**/*.storybook_decorator.*'],
    rules: {
      '@kbn/telemetry/ebt_props_should_be_present': 'warn',
    },
  },
];
