/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  overrides: [
    {
      // Prevent new dangerouslySetInnerHTML usage in field_formats except in the centralized adapter
      files: ['**/*.tsx'],
      excludedFiles: ['**/formatted_value.tsx', '**/*.test.tsx'],
      rules: {
        'react/no-danger': [
          'error',
          // This rule will flag any dangerouslySetInnerHTML usage.
          // All formatter HTML rendering should go through FormattedValue component.
        ],
      },
    },
  ],
};
