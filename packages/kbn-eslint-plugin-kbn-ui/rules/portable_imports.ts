/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Ignore } from 'ignore';
import ignore from 'ignore';
import type { CreateOnceRule, ESTree } from '@oxlint/plugins';

interface PortableImportsOptions {
  patterns?: string[];
}

/**
 * typescript-eslint's `no-restricted-imports` with string `patterns`, under a separate name so the
 * kbn-ui allowlist adds to the repo-wide `no-restricted-imports` config instead of replacing it.
 * Patterns are gitignore-style (`!` negates) and match case-insensitively, as in that rule.
 */
export const PortableImports: CreateOnceRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow import sources that match gitignore-style patterns',
    },
    messages: {
      patterns: "'{{importSource}}' import is restricted from being used by a pattern.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context) {
    let matcher: Ignore;

    const check = (node: ESTree.Node, source: ESTree.StringLiteral) => {
      const importSource = source.value.trim();
      if (matcher.ignores(importSource)) {
        context.report({ node, messageId: 'patterns', data: { importSource } });
      }
    };

    return {
      before() {
        const { patterns = [] } = (context.options[0] ?? {}) as PortableImportsOptions;
        if (patterns.length === 0) {
          return false;
        }

        // The matcher ESLint's `no-restricted-imports` builds for string patterns.
        matcher = ignore({ allowRelativePaths: true, ignoreCase: true }).add(patterns);
      },
      // Type-only imports and exports are checked too: string patterns cannot set `allowTypeImports`.
      ImportDeclaration(node) {
        check(node, node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          check(node, node.source);
        }
      },
      ExportAllDeclaration(node) {
        check(node, node.source);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          check(node, node.moduleReference.expression);
        }
      },
    };
  },
};
