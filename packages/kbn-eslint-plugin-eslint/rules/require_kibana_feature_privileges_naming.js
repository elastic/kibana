/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ts = require('typescript');
const path = require('path');

function getImportedVariableValue(context, name, propertyName) {
  const parent = context
    .getAncestors()
    .find((ancestor) => ['BlockStatement', 'Program'].includes(ancestor.type));

  if (!parent) return;

  const importDeclaration = parent.body.find(
    (statement) =>
      statement.type === 'ImportDeclaration' &&
      statement.specifiers.some((specifier) => specifier.local.name === name)
  );

  if (!importDeclaration) return;

  const absoluteImportPath = require.resolve(importDeclaration.source.value, {
    paths: [path.dirname(context.getFilename())],
  });

  const program = ts.createProgram([absoluteImportPath], {});
  const sourceFile = program.getSourceFile(absoluteImportPath);

  if (!sourceFile) return null;

  const checker = program.getTypeChecker();
  const symbols = checker.getExportsOfModule(sourceFile.symbol);
  const symbol = symbols.find((s) => s.name === name);

  if (!symbol) return null;

  if (propertyName) {
    const currentSymbol = checker.getTypeOfSymbolAtLocation(symbol, sourceFile);
    const property = currentSymbol.getProperty(propertyName);

    if (ts.isStringLiteral(property.valueDeclaration.initializer)) {
      return property.valueDeclaration.initializer.text;
    }

    return null;
  }

  const initializer = symbol?.valueDeclaration?.initializer;

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  return null;
}

function validatePrivilegesNode(context, privilegesNode, scopedVariables) {
  ['all', 'read'].forEach((privilegeType) => {
    const privilege = privilegesNode.value.properties.find(
      (prop) =>
        prop.key && prop.key.name === privilegeType && prop.value.type === 'ObjectExpression'
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
      } else if (element.type === 'Identifier') {
        valueToCheck = scopedVariables.has(element.name)
          ? scopedVariables.get(element.name)
          : getImportedVariableValue(context, element.name);
      } else if (element.type === 'MemberExpression') {
        valueToCheck = getImportedVariableValue(
          context,
          element.object.name,
          element.property.name
        );
      }

      if (valueToCheck) {
        const isValid = /^(manage|create|update|delete|read)/.test(valueToCheck);
        const usesValidSeparator = /^[a-z0-9_]+$/.test(valueToCheck);
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
          return context.report({
            node: element,
            message: `API privilege '${valueToCheck}' should start with [manage|create|update|delete|read] or use ApiPrivileges.${method} instead`,
          });
        }

        if (!usesValidSeparator) {
          return context.report({
            node: element,
            message: `API privilege '${valueToCheck}' should use '_' as a separator`,
          });
        }
      }
    });
  });
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure API privileges in registerKibanaFeature call follow naming conventions',
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

          return validatePrivilegesNode(context, privilegesProperty, scopedVariables);
        }
      },
      ExportNamedDeclaration(node) {
        if (
          node.declaration?.type !== 'VariableDeclaration' ||
          !node.declaration.declarations?.length
        ) {
          return;
        }

        node.declaration.declarations.forEach((declaration) => {
          if (declaration.init && declaration.init.type === 'ObjectExpression') {
            if (
              !['id', 'name', 'privileges', 'scope', 'category'].every((key) =>
                declaration.init.properties.find((prop) => prop.key?.name === key)
              )
            ) {
              return;
            }

            const privilegesProperty = declaration.init.properties.find(
              (prop) =>
                prop.key && prop.key.name === 'privileges' && prop.value.type === 'ObjectExpression'
            );

            validatePrivilegesNode(context, privilegesProperty, new Map());
          }
        });
      },
    };
  },
};
