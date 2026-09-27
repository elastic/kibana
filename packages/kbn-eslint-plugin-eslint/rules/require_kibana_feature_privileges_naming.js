/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const ts = require('typescript');

const sourceFileCache = new Map();

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function unwrapExpression(expression) {
  let unwrapped = expression;
  while (
    ts.isAsExpression(unwrapped) ||
    ts.isParenthesizedExpression(unwrapped) ||
    ts.isSatisfiesExpression(unwrapped) ||
    ts.isTypeAssertionExpression(unwrapped)
  ) {
    unwrapped = unwrapped.expression;
  }
  return unwrapped;
}

function parseSourceFile(filename) {
  if (sourceFileCache.has(filename)) {
    return sourceFileCache.get(filename);
  }

  try {
    const sourceFile = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, 'utf-8'),
      ts.ScriptTarget.ESNext,
      true
    );
    sourceFileCache.set(filename, sourceFile);
    return sourceFile;
  } catch {
    return null;
  }
}

function resolveModule(from, specifier) {
  return ts.resolveModuleName(specifier, from, {}, ts.sys).resolvedModule?.resolvedFileName;
}

function findLocalInitializer(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    const declaration = statement.declarationList.declarations.find(
      (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === name
    );

    if (declaration?.initializer) {
      return declaration.initializer;
    }
  }

  return null;
}

function findExportInitializer(filename, name, seen = new Set()) {
  if (seen.has(filename)) {
    return null;
  }
  seen.add(filename);

  const sourceFile = parseSourceFile(filename);
  if (!sourceFile) {
    return null;
  }

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      const declaration = statement.declarationList.declarations.find(
        (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === name
      );
      if (declaration?.initializer) {
        return declaration.initializer;
      }
      continue;
    }

    if (!ts.isExportDeclaration(statement)) {
      continue;
    }

    const exportSpecifier =
      statement.exportClause && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.find((candidate) => candidate.name.text === name)
        : undefined;

    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
      if (exportSpecifier) {
        return findLocalInitializer(sourceFile, exportSpecifier.propertyName?.text ?? name);
      }
      continue;
    }

    const modulePath = resolveModule(sourceFile.fileName, statement.moduleSpecifier.text);
    if (!modulePath) {
      continue;
    }

    if (!statement.exportClause) {
      const initializer = findExportInitializer(modulePath, name, seen);
      if (initializer) {
        return initializer;
      }
      continue;
    }

    if (exportSpecifier) {
      return findExportInitializer(modulePath, exportSpecifier.propertyName?.text ?? name, seen);
    }
  }

  return null;
}

function getExpressionValue(expression, propertyName) {
  const unwrapped = unwrapExpression(expression);

  if (propertyName) {
    if (!ts.isObjectLiteralExpression(unwrapped)) {
      return null;
    }

    const property = unwrapped.properties.find(
      (candidate) =>
        ts.isPropertyAssignment(candidate) &&
        (ts.isIdentifier(candidate.name) || ts.isStringLiteral(candidate.name)) &&
        candidate.name.text === propertyName
    );

    return property && ts.isPropertyAssignment(property)
      ? getExpressionValue(property.initializer)
      : null;
  }

  return ts.isStringLiteral(unwrapped) ? unwrapped.text : null;
}

function getImportedVariableValue(imports, filename, name, propertyName) {
  const importedValue = imports.get(name);
  if (!importedValue) {
    return null;
  }

  const modulePath = resolveModule(filename, importedValue.source);
  if (!modulePath) {
    return null;
  }

  const exportedName = importedValue.name ?? propertyName;
  if (!exportedName) {
    return null;
  }

  const initializer = findExportInitializer(modulePath, exportedName);
  return initializer
    ? getExpressionValue(initializer, importedValue.name ? propertyName : undefined)
    : null;
}

function getImports(program) {
  const imports = new Map();

  program.body.forEach((statement) => {
    if (statement.type !== 'ImportDeclaration') {
      return;
    }

    statement.specifiers.forEach((specifier) => {
      if (specifier.type === 'ImportSpecifier') {
        imports.set(specifier.local.name, {
          source: statement.source.value,
          name: specifier.imported.name,
        });
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        imports.set(specifier.local.name, { source: statement.source.value });
      }
    });
  });

  return imports;
}

function validatePrivilegesNode(context, privilegesNode, scopedVariables, imports, filename) {
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
          : getImportedVariableValue(imports, filename, element.name);
      } else if (
        element.type === 'MemberExpression' &&
        element.object.type === 'Identifier' &&
        element.property.type === 'Identifier'
      ) {
        valueToCheck = getImportedVariableValue(
          imports,
          filename,
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

  createOnce(context) {
    let imports;

    return {
      before() {
        imports = getImports(context.sourceCode.ast);
      },
      CallExpression(node) {
        const isRegisterKibanaFeatureCall =
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'registerKibanaFeature' &&
          ((node.callee.object.type === 'MemberExpression' &&
            node.callee.object.property.name === 'features') ||
            node.callee.object.name === 'features');

        if (!isRegisterKibanaFeatureCall) return;

        const scopedVariables = new Map();

        const sourceCode = context.sourceCode;

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

          return validatePrivilegesNode(
            context,
            privilegesProperty,
            scopedVariables,
            imports,
            context.filename
          );
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

            validatePrivilegesNode(
              context,
              privilegesProperty,
              new Map(),
              imports,
              context.filename
            );
          }
        });
      },
    };
  },
};
