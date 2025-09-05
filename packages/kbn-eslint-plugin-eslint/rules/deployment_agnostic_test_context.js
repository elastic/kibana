/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const DEPLOYMENT_AGNOSTIC_CONTEXT_ERROR =
  'Deployment-agnostic tests must use DeploymentAgnosticFtrProviderContext instead of FtrProviderContext';

const SUPERTEST_SERVICE_ERROR =
  "getService('supertest') is not compatible with running tests on MKI. Use 'roleScopedSupertest' instead for deployment-agnostic tests";

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce proper context provider and service usage in deployment-agnostic tests and services',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      deploymentAgnosticContext: DEPLOYMENT_AGNOSTIC_CONTEXT_ERROR,
      supertestService: SUPERTEST_SERVICE_ERROR,
    },
  },
  create: (context) => {
    return {
      // Check function parameter types for DeploymentAgnosticFtrProviderContext
      FunctionDeclaration(node) {
        // Look for export default function pattern
        if (node.params.length > 0) {
          const param = node.params[0];
          if (param.type === 'ObjectPattern' && param.typeAnnotation) {
            const typeAnnotation = param.typeAnnotation.typeAnnotation;
            if (typeAnnotation.type === 'TSTypeReference' && typeAnnotation.typeName) {
              const typeName = typeAnnotation.typeName.name;
              if (typeName !== 'DeploymentAgnosticFtrProviderContext') {
                context.report({
                  node: typeAnnotation,
                  messageId: 'deploymentAgnosticContext',
                });
              }
            }
          }
        }
      },

      // Check export default function expression
      ExportDefaultDeclaration(node) {
        if (node.declaration.type === 'FunctionExpression' && node.declaration.params.length > 0) {
          const param = node.declaration.params[0];
          if (param.type === 'ObjectPattern' && param.typeAnnotation) {
            const typeAnnotation = param.typeAnnotation.typeAnnotation;
            if (typeAnnotation.type === 'TSTypeReference' && typeAnnotation.typeName) {
              const typeName = typeAnnotation.typeName.name;
              if (typeName !== 'DeploymentAgnosticFtrProviderContext') {
                context.report({
                  node: typeAnnotation,
                  messageId: 'deploymentAgnosticContext',
                });
              }
            }
          }
        }
      },

      // Check for getService('supertest') calls
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'getService' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === 'supertest'
        ) {
          context.report({
            node,
            messageId: 'supertestService',
          });
        }
      },
    };
  },
};
