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

export const NoDirectHandlebarsImportRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Disallow direct imports from handlebars package. Use @kbn/handlebars instead.',
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_direct_handlebars_import',
    },
    messages: {
      noDirectHandlebarsImport:
        'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
    },
  },

  create(context) {
    return visitAllImportStatements((req, { node }) => {
      if (!req) {
        return;
      }

      // Skip the rule for files within the kbn-handlebars package itself
      const filename = context.getFilename();
      if (filename.includes('/kbn-handlebars/') || filename.includes('\\kbn-handlebars\\')) {
        return;
      }

      // Check for direct imports from 'handlebars' package
      if (req === 'handlebars' || req.startsWith('handlebars/')) {
        // Replace 'handlebars' with '@kbn/handlebars' in the import request
        const correctImport = req.replace(/^handlebars/, '@kbn/handlebars');

        report(context, {
          node,
          message:
            'Do not import directly from "handlebars". Use the custom Handlebars from "@kbn/handlebars" instead.',
          correctImport,
        });
      }
    });
  },
};
