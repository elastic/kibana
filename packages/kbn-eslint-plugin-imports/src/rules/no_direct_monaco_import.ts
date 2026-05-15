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

/**
 * Disallows importing from `@kbn/monaco` directly (any path) and from
 * `@kbn/code-editor` subpaths. Consumers should import from `@kbn/code-editor`
 * at the package root only.
 */
export const NoDirectMonacoImportRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow importing from @kbn/monaco. Use @kbn/code-editor instead, importing from the package root only.',
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_direct_monaco_import',
    },
    messages: {
      noMonacoImport:
        'Do not import from "{{source}}". Import from "@kbn/code-editor" instead. ' +
        'If the symbol is not yet exported from "@kbn/code-editor", add it to that package\'s index first.',
      noCodeEditorSubpathImport:
        'Do not import from "@kbn/code-editor" subpaths (got "{{source}}"). ' +
        'Import from "@kbn/code-editor" at the package root only.',
    },
  },

  create(context) {
    return visitAllImportStatements((req, { node }) => {
      if (!req) {
        return;
      }

      // Skip rule for files within @kbn/monaco and @kbn/code-editor themselves
      const filename = context.filename;
      if (
        filename.includes('/kbn-monaco/') ||
        filename.includes('\\kbn-monaco\\') ||
        // code_editor/impl is the @kbn/code-editor package directory
        (filename.includes('/code_editor/impl/') && !filename.includes('/node_modules/')) ||
        (filename.includes('\\code_editor\\impl\\') && !filename.includes('\\node_modules\\'))
      ) {
        return;
      }

      // Warn on any import from @kbn/monaco (root or subpath)
      if (req === '@kbn/monaco' || req.startsWith('@kbn/monaco/')) {
        context.report({
          node: node as any,
          messageId: 'noMonacoImport',
          data: { source: req },
        });
        return;
      }

      // Warn on @kbn/code-editor subpath imports (anything beyond the package root)
      if (req.startsWith('@kbn/code-editor/')) {
        context.report({
          node: node as any,
          messageId: 'noCodeEditorSubpathImport',
          data: { source: req },
        });
      }
    });
  },
};
