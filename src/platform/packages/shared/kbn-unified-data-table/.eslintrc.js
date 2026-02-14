/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ESLint configuration for kbn-unified-data-table
 *
 * This package should NOT use dangerouslySetInnerHTML for field formatter output.
 * Instead, use FormatFieldValueReact from @kbn/discover-utils or FormattedValue
 * from @kbn/field-formats-plugin/public.
 *
 * See @kbn/field-formats-plugin README for migration guidance.
 */
module.exports = {
  overrides: [
    {
      // Prevent new dangerouslySetInnerHTML usage for formatter output
      files: ['**/*.tsx'],
      excludedFiles: ['**/*.test.tsx'],
      rules: {
        'react/no-danger': [
          'error',
          // All field formatter HTML rendering should use FormatFieldValueReact or FormattedValue.
          // If you need to render formatter output, use the React rendering path.
        ],
      },
    },
  ],
};
