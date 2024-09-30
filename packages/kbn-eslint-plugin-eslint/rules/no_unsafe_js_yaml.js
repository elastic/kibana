/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    const jsYamlIdentifiers = new Set();
    const isUnsafeMethod = (node) => node.name === 'load' || node.name === 'dump';

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'js-yaml') {
          node.specifiers.forEach((specifier) => {
            jsYamlIdentifiers.add(specifier.local.name);

            if (specifier.imported && isUnsafeMethod(specifier.imported)) {
              context.report({
                node: specifier,
                message:
                  'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
                fix(fixer) {
                  const replacement =
                    specifier.imported.name === 'load'
                      ? fixer.replaceText(specifier.imported, 'safeLoad')
                      : fixer.replaceText(specifier.imported, 'safeDump');
                  return replacement;
                },
              });
            }
          });
        }
      },
      CallExpression(node) {
        const callee = node.callee;

        if (isUnsafeMethod(callee)) {
          const scope = sourceCode.getScope(node);
          const variable = scope.variables.find((v) => v.name === callee.name);

          if (variable && variable.defs.length) {
            const [def] = variable.defs;

            if (def?.parent?.source?.value === 'js-yaml') {
              context.report({
                node: callee,
                message:
                  'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
                fix(fixer) {
                  const replacement =
                    callee.name === 'load'
                      ? fixer.replaceText(callee, 'safeLoad')
                      : fixer.replaceText(callee, 'safeDump');
                  return replacement;
                },
              });
            }
          }
        }

        if (
          callee.type === 'MemberExpression' &&
          isUnsafeMethod(callee.property) &&
          jsYamlIdentifiers.has(callee.object.name)
        ) {
          context.report({
            node: callee.property,
            message:
              'Use `safeLoad` instead of `load` and `safeDump` instead of `dump` from `js-yaml`.',
            fix(fixer) {
              const replacement =
                callee.property.name === 'load'
                  ? fixer.replaceText(callee.property, 'safeLoad')
                  : fixer.replaceText(callee.property, 'safeDump');
              return replacement;
            },
          });
        }
      },
    };
  },
};
