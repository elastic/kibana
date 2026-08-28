/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';
import { report } from '../helpers/report';

const V2_TO_V1_ALIASES: Record<string, string> = {
  '@reduxjs/toolkit': 'redux-toolkit-v1',
  'react-redux': 'react-redux-v7',
  redux: 'redux-v4',
  immer: 'immer-v9',
  reselect: 'reselect-v4',
  'redux-thunk': 'redux-thunk-v2',
};

/** Paths that are part of bundler infrastructure and intentionally use the v2 packages */
const INFRA_PATH_PATTERNS = [
  /kbn-ui-shared-deps-npm/,
  /kbn-ui-shared-deps-src/,
  /kbn-optimizer/,
  /kbn-rspack-optimizer/,
];

export const NoReduxToolkitV2ImportsRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Disallow imports of v2 Redux packages. Use v1 aliased packages (e.g. redux-toolkit-v1) during the migration period.',
    },
    messages: {
      noV2ReduxImport:
        'Import from "{{v1Alias}}" instead of "{{v2Package}}". ' +
        'See dev_docs/contributing/redux_toolkit_v1_v2_migration.mdx for details.',
    },
  },

  create(context) {
    const filename = context.getFilename();

    // Skip bundler infrastructure files that intentionally reference v2
    if (INFRA_PATH_PATTERNS.some((pattern) => pattern.test(filename))) {
      return {};
    }

    return visitAllImportStatements((req, { node }) => {
      if (!req) {
        return;
      }

      // Check for exact match or subpath imports (e.g. '@reduxjs/toolkit/query')
      for (const [v2Package, v1Alias] of Object.entries(V2_TO_V1_ALIASES)) {
        if (req === v2Package || req.startsWith(`${v2Package}/`)) {
          const correctImport = req === v2Package ? v1Alias : req.replace(v2Package, v1Alias);

          report(context, {
            node,
            message: `Import from "${v1Alias}" instead of "${v2Package}". See dev_docs/contributing/redux_toolkit_v1_v2_migration.mdx for details.`,
            correctImport,
          });
          return;
        }
      }
    });
  },
};
