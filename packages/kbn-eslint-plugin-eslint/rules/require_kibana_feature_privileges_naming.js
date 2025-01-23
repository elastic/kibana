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
    type: 'problem',
    docs: {
      description: 'Ensure API privileges in registerKibanaFeature follow naming conventions.',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const isRegisterKibanaFeatureCall =
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'registerKibanaFeature' &&
          ((node.callee.object.type === 'MemberExpression' &&
            node.callee.object.property.name === 'features') ||
            node.callee.object.name === 'features');

        if (!isRegisterKibanaFeatureCall) return;

        const scopedVariables = new Map();

        const sourceCode = context.getSourceCode();

        const parent = sourceCode
          .getAncestors(node)
          .find((ancestor) => ['BlockStatement', 'Program'].includes(ancestor.type));

        if (parent) {
          parent.body.forEach((statement) => {
            if (statement.type === 'VariableDeclaration') {
              statement.declarations.forEach((declaration) => {
                if (
                  declaration.id.type === 'Identifier' &&
                  declaration.init &&
                  declaration.init.type === 'Literal' &&
                  typeof declaration.init.value === 'string'
                ) {
                  scopedVariables.set(declaration.id.name, declaration.init.value);
                }
              });
            }
          });
        }

        const [feature] = node.arguments;
        if (feature?.type === 'ObjectExpression') {
          const privilegesProperty = feature.properties.find(
            (prop) =>
              prop.key && prop.key.name === 'privileges' && prop.value.type === 'ObjectExpression'
          );

          if (!privilegesProperty) return;

          ['all', 'read'].forEach((privilegeType) => {
            const privilege = privilegesProperty.value.properties.find(
              (prop) =>
                prop.key &&
                prop.key.name === privilegeType &&
                prop.value.type === 'ObjectExpression'
            );

            if (!privilege) return;

            const apiProperty = privilege.value.properties.find(
              (prop) => prop.key && prop.key.name === 'api' && prop.value.type === 'ArrayExpression'
            );

            if (!apiProperty) return;

            apiProperty.value.elements.forEach((element) => {
              let valueToCheck = null;

              if (element.type === 'Literal' && typeof element.value === 'string') {
                valueToCheck = element.value;
              } else if (element.type === 'Identifier' && scopedVariables.has(element.name)) {
                valueToCheck = scopedVariables.get(element.name);
              }

              if (valueToCheck) {
                const isValid = /^(manage|create|update|delete|read)_/.test(valueToCheck);
                let method = 'manage';

                if (valueToCheck.includes('read')) {
                  method = 'read';
                }

                if (valueToCheck.includes('create') || valueToCheck.includes('copy')) {
                  method = 'create';
                }

                if (valueToCheck.includes('delete')) {
                  method = 'delete';
                }

                if (valueToCheck.includes('update')) {
                  method = 'update';
                }

                if (!isValid) {
                  context.report({
                    node: element,
                    message: `API privilege '${valueToCheck}' should start with [manage|create|update|delete|read]_ or use ApiPrivileges.${method} instead`,
                  });
                }
              }
            });
          });
        }
      },
    };
  },
};
