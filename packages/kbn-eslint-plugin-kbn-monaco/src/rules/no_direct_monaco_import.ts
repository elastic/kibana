/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, ESTree } from '@oxlint/plugins';
import { isMonacoPackageFile } from '../helpers/is_monaco_package_file';

/** The jest methods that take a module request as their first argument. */
const JEST_MODULE_METHODS = new Set([
  'jest.createMockFromModule',
  'jest.mock',
  'jest.unmock',
  'jest.doMock',
  'jest.dontMock',
  'jest.setMock',
  'jest.requireActual',
  'jest.requireMock',
]);

/** The module a node asks for, when that is known statically: a string, or a template without holes. */
const getRequest = (node: ESTree.Node | null | undefined): string | null => {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.reduce((request, quasi) => request + quasi.value.raw, '');
  }

  return null;
};

/**
 * Disallows importing from `@kbn/monaco` directly (any path) and from
 * `@kbn/code-editor` subpaths. Consumers should import from `@kbn/code-editor`
 * at the package root only.
 *
 * Every way of asking for a module is covered: `import`, `export ... from`, `import()`,
 * `require()`, `require.resolve()` and the jest methods that take a module request.
 */
export const NoDirectMonacoImportRule: CreateOnceRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow importing from @kbn/monaco. Use @kbn/code-editor instead, importing from the package root only.',
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-kbn-monaco/README.mdx#kbnkbn-monacono_direct_monaco_import',
      recommended: true,
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

  createOnce(context) {
    const check = (request: string | null, node: ESTree.Node) => {
      if (!request) {
        return;
      }

      // any import from @kbn/monaco, root or subpath
      if (request === '@kbn/monaco' || request.startsWith('@kbn/monaco/')) {
        context.report({ node, messageId: 'noMonacoImport', data: { source: request } });
        return;
      }

      // @kbn/code-editor subpath imports: anything beyond the package root
      if (request.startsWith('@kbn/code-editor/')) {
        context.report({ node, messageId: 'noCodeEditorSubpathImport', data: { source: request } });
      }
    };

    return {
      before() {
        // Skipped for the packages that own the boundary; returning `false` skips the whole file.
        return !isMonacoPackageFile(context.filename);
      },

      ImportDeclaration(node) {
        check(node.source.value, node);
      },

      ExportNamedDeclaration(node) {
        check(node.source?.value ?? null, node);
      },

      ExportAllDeclaration(node) {
        check(node.source.value, node);
      },

      ImportExpression(node) {
        check(getRequest(node.source), node);
      },

      CallExpression(node) {
        const { callee } = node;

        if (callee.type === 'Identifier' && callee.name === 'require') {
          check(getRequest(node.arguments[0]), node);
          return;
        }

        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.object.type === 'Identifier' &&
          callee.property.type === 'Identifier'
        ) {
          const name = `${callee.object.name}.${callee.property.name}`;

          if (name === 'require.resolve' || JEST_MODULE_METHODS.has(name)) {
            check(getRequest(node.arguments[0]), node);
          }
        }
      },
    };
  },
};
