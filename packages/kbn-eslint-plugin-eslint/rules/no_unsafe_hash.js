/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Allow usage of createHash only with allowed algorithms.',
      category: 'FIPS',
      recommended: false,
    },
    messages: {
      noDisallowedHash:
        'Usage of createHash with "{{algorithm}}" is not allowed. Only the following algorithms are allowed: [{{allowedAlgorithms}}]. If you need to use a different algorithm, please contact the Kibana security team.',
    },
    schema: [],
  },
  create(context) {
    const allowedAlgorithms = ['sha1', 'sha256', 'sha3-256'];

    let isCreateHashImported = false;
    let createHashName = 'createHash';
    const sourceCode = context.getSourceCode();

    const disallowedAlgorithmNodes = new Set();

    function isAllowedAlgorithm(algorithm) {
      return allowedAlgorithms.includes(algorithm);
    }

    function getIdentifierValue(node) {
      const scope = sourceCode.getScope(node);
      if (scope) {
        const variable = scope.variables.find((variable) => variable.name === node.name);
        if (variable && variable.defs.length > 0) {
          const def = variable.defs[0];
          if (
            def.node.init &&
            def.node.init.type === 'Literal' &&
            !isAllowedAlgorithm(def.node.init.value)
          ) {
            disallowedAlgorithmNodes.add(node.name);
            return def.node.init.value;
          }
        }
      }
      return undefined;
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'crypto') {
          node.specifiers.forEach((specifier) => {
            if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'createHash') {
              isCreateHashImported = true;
              createHashName = specifier.local.name;
            }
          });
        }
      },
      VariableDeclarator(node) {
        if (node.init && node.init.type === 'Literal' && !isAllowedAlgorithm(node.init.value)) {
          disallowedAlgorithmNodes.add(node.id.name);
        }
      },
      AssignmentExpression(node) {
        if (
          node.right.type === 'Literal' &&
          node.right.value === 'md5' &&
          node.left.type === 'Identifier'
        ) {
          disallowedAlgorithmNodes.add(node.left.name);
        }
      },
      CallExpression(node) {
        if (
          (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'crypto' &&
            node.callee.property.name === 'createHash') ||
          (isCreateHashImported && node.callee.name === createHashName)
        ) {
          if (node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === 'Literal' && !isAllowedAlgorithm(arg.value)) {
              context.report({
                node,
                messageId: 'noDisallowedHash',
                data: {
                  algorithm: arg.value,
                  allowedAlgorithms: allowedAlgorithms.join(', '),
                },
              });
            } else if (arg.type === 'Identifier') {
              const identifierValue = getIdentifierValue(arg);
              if (disallowedAlgorithmNodes.has(arg.name) && identifierValue) {
                context.report({
                  node,
                  messageId: 'noDisallowedHash',
                  data: {
                    algorithm: identifierValue,
                    allowedAlgorithms: allowedAlgorithms.join(', '),
                  },
                });
              }
            }
          }
        }
      },
    };
  },
};
