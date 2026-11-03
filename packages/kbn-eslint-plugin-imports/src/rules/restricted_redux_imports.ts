/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, ESTree } from '@oxlint/plugins';

export const RestrictedReduxImportsRule: CreateOnceRule = {
  meta: {
    type: 'suggestion',
    schema: [
      {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                importNames: { type: 'array', items: { type: 'string' } },
                message: { type: 'string' },
              },
              required: ['name', 'importNames', 'message'],
              additionalProperties: false,
            },
          },
        },
        required: ['paths'],
        additionalProperties: false,
      },
    ],
    messages: {
      restricted: "'{{name}}' import from '{{source}}' is restricted. {{message}}",
      namespace:
        "* import is invalid because '{{names}}' from '{{source}}' is restricted. {{message}}",
    },
  },
  createOnce(context) {
    const check = (
      node: ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration
    ) => {
      if (!node.source) return;
      const [options] = context.options as ReadonlyArray<{
        paths: Array<{ name: string; importNames: string[]; message: string }>;
      }>;
      const restriction = options?.paths.find(({ name }) => name === node.source?.value);
      if (!restriction) return;
      const reportNamespace = (target: ESTree.Node) => {
        context.report({
          node: target,
          messageId: 'namespace',
          data: {
            names: restriction.importNames.join(','),
            source: restriction.name,
            message: restriction.message,
          },
        });
      };
      if (node.type === 'ExportAllDeclaration') {
        reportNamespace(node);
        return;
      }
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          reportNamespace(specifier);
          continue;
        }
        const imported =
          specifier.type === 'ImportSpecifier'
            ? specifier.imported
            : specifier.type === 'ExportSpecifier'
            ? specifier.local
            : undefined;
        const name = imported?.type === 'Identifier' ? imported.name : imported?.value;
        if (typeof name !== 'string' || !restriction.importNames.includes(name)) continue;
        context.report({
          node: specifier,
          messageId: 'restricted',
          data: { name, source: restriction.name, message: restriction.message },
        });
      }
    };
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
