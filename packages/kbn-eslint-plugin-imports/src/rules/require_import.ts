/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { load } from 'cheerio';

type StringModuleConfig = string;

interface ObjectModuleConfig {
  module: string;
  as: ReferenceModuleAs;
}

type ModuleConfig = StringModuleConfig | ObjectModuleConfig;

enum ReferenceModuleAs {
  typeReference = 'typeReference',
}

export const RequireImportRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsrequire_import',
    },
    schema: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'object',
            additionalProperties: false,
            additionalItems: false,
            properties: {
              module: {
                type: 'string',
              },
              as: {
                type: 'string',
              },
            },
            required: ['module', 'type'],
          },
        ],
      },
    },
  },

  create(context) {
    const requiredImports: ModuleConfig[] = context.options;

    const mappedOptions: ObjectModuleConfig[] = requiredImports.map((config) => {
      if (typeof config === 'string') {
        return {
          module: config,
          as: ReferenceModuleAs.typeReference,
        };
      }
      return config;
    });

    return {
      'Program:exit': (node) => {
        mappedOptions.forEach((option) => {
          switch (option.as) {
            case ReferenceModuleAs.typeReference:
              const hasImport = node.comments?.some((comment) => {
                const nodeText = comment.value.match(/\/\s*(<.*>)/)?.[1];
                if (nodeText) {
                  const parsedNode = load(nodeText, { xml: true })()._root?.children()[0];
                  return (
                    parsedNode &&
                    parsedNode.name === 'reference' &&
                    parsedNode.attribs.types === option.module
                  );
                }
              });

              if (!hasImport) {
                context.report({
                  node,
                  message: `Required module '${option.module}' is not imported as a type reference`,
                  fix(fixer) {
                    return fixer.insertTextBefore(
                      node.body[0],
                      `/// <reference types="${option.module}"/>\n\n`
                    );
                  },
                });
              }
          }
        });
      },
    };
  },
};
