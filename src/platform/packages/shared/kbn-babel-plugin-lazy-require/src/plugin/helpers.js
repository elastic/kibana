/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Helper utilities for the lazy-require Babel plugin
 */

/**
 * Check if an identifier is in a TypeScript type-only context
 * Returns true if the identifier is in a pure type context that won't exist at runtime
 */
function isInTypeContext(path, t) {
  let currentPath = path;
  while (currentPath) {
    const parentNode = currentPath.parent;
    if (!parentNode) break;

    // Check if we're inside a pure type context
    if (
      parentNode.type &&
      (t.isTSTypeAnnotation(parentNode) ||
        t.isTSTypeReference(parentNode) ||
        t.isTSTypeParameterDeclaration(parentNode) ||
        t.isTSTypeParameter(parentNode) ||
        t.isTSInterfaceDeclaration(parentNode) ||
        t.isTSTypeAliasDeclaration(parentNode) ||
        t.isTSTypeQuery(parentNode) ||
        t.isTSTypeLiteral(parentNode) ||
        t.isTSIndexedAccessType(parentNode) ||
        t.isTSMappedType(parentNode) ||
        t.isTSConditionalType(parentNode) ||
        t.isTSExpressionWithTypeArguments(parentNode))
    ) {
      return true;
    }

    currentPath = currentPath.parentPath;
  }

  return false;
}

/**
 * Check if an identifier should be skipped during replacement
 * Returns true if this identifier is not a variable reference we should transform
 */
function shouldSkipIdentifier(path, properties, programPath, t) {
  const varName = path.node.name;

  // Not one of our tracked imports
  if (!properties.has(varName)) {
    return true;
  }

  // Skip variable/function declarations (where names are defined)
  if (
    (t.isVariableDeclarator(path.parent) && path.parent.id === path.node) ||
    (t.isFunctionDeclaration(path.parent) && path.parent.id === path.node)
  ) {
    return true;
  }

  // Skip export/import specifiers
  if (
    t.isExportSpecifier(path.parent) ||
    t.isImportSpecifier(path.parent) ||
    t.isImportDefaultSpecifier(path.parent) ||
    t.isImportNamespaceSpecifier(path.parent) ||
    t.isTSImportEqualsDeclaration(path.parent)
  ) {
    return true;
  }

  // Skip object property keys (non-computed)
  if (
    (t.isObjectProperty(path.parent) || t.isObjectMethod(path.parent)) &&
    path.parent.key === path.node &&
    !path.parent.computed
  ) {
    return true;
  }

  // Skip member expression properties (e.g., 'bar' in 'foo.bar' or 'foo?.bar')
  if (
    (t.isMemberExpression(path.parent) || t.isOptionalMemberExpression(path.parent)) &&
    path.parent.property === path.node &&
    !path.parent.computed
  ) {
    return true;
  }

  // Skip class method/property keys
  if (
    (t.isClassMethod(path.parent) || t.isClassProperty(path.parent)) &&
    path.parent.key === path.node &&
    !path.parent.computed
  ) {
    return true;
  }

  // Skip TypeScript type contexts
  if (isInTypeContext(path, t)) {
    return true;
  }

  // Check scope: only replace if binding is from program scope
  const binding = path.scope.getBinding(varName);
  if (binding && binding.scope !== programPath.scope) {
    // This is a local variable shadowing our import
    return true;
  }

  return false;
}

/**
 * Detect which imports are used in JSX syntax anywhere in the file
 * Returns a Set of variable names that should not be lazy-loaded
 * JSX transforms happen at compile time, so components need to be directly available
 */
function detectJsxUsage(programPath, properties, t) {
  const importsUsedInJsx = new Set();

  programPath.traverse({
    JSXIdentifier(jsxIdPath) {
      const name = jsxIdPath.node.name;
      // Only care about opening/closing element names, not attribute names
      if (
        properties.has(name) &&
        (t.isJSXOpeningElement(jsxIdPath.parent) || t.isJSXClosingElement(jsxIdPath.parent))
      ) {
        importsUsedInJsx.add(name);
      }
    },
  });

  return importsUsedInJsx;
}

/**
 * Detect which imports are used in jest.mock() factory functions
 * Returns a Set of variable names that should not be lazy-loaded
 * Jest mock factories cannot reference out-of-scope variables
 */
function detectJestMockUsage(programPath, properties, t) {
  const importsUsedInJestMocks = new Set();

  programPath.traverse({
    CallExpression(callPath) {
      const { callee } = callPath.node;

      // Check if this is a jest.mock(), jest.doMock(), or jest.unmock() call
      let isJestMock = false;
      if (t.isMemberExpression(callee)) {
        // jest.mock(), jest.doMock(), jest.unmock()
        if (
          t.isIdentifier(callee.object, { name: 'jest' }) &&
          t.isIdentifier(callee.property) &&
          ['mock', 'doMock', 'unmock'].includes(callee.property.name)
        ) {
          isJestMock = true;
        }
      }

      if (!isJestMock) {
        return;
      }

      // Check the factory function (2nd argument) for import usage
      const factoryArg = callPath.node.arguments[1];
      if (!factoryArg) {
        return;
      }

      // Traverse the factory function to find import references
      const factoryPath = callPath.get('arguments.1');
      if (!factoryPath) {
        return;
      }

      factoryPath.traverse({
        Identifier(idPath) {
          const name = idPath.node.name;
          if (properties.has(name) && idPath.isReferencedIdentifier()) {
            importsUsedInJestMocks.add(name);
          }
        },
      });
    },
  });

  return importsUsedInJestMocks;
}

/**
 * Detect which imports are used in module-level code that runs at initialization
 * Returns a Set of variable names that should not be lazy-loaded
 */
function detectModuleLevelUsage(programPath, properties, isSimpleRequireCall, t) {
  const importsUsedInModuleLevelCode = new Set();

  // Helper to check if code uses any of our imports
  const checkForImportUsage = (nodePath) => {
    nodePath.traverse({
      Identifier(idPath) {
        const name = idPath.node.name;
        if (properties.has(name) && idPath.isReferencedIdentifier()) {
          importsUsedInModuleLevelCode.add(name);
        }
      },
      JSXIdentifier(jsxIdPath) {
        const name = jsxIdPath.node.name;
        if (properties.has(name)) {
          importsUsedInModuleLevelCode.add(name);
        }
      },
    });
  };

  programPath.traverse({
    // TypeScript import equals (export import alias = Module)
    TSImportEqualsDeclaration(tsImportPath) {
      const isTopLevel = tsImportPath.parent === programPath.node;

      let isInTopLevelNamespace = false;
      if (t.isTSModuleBlock(tsImportPath.parent)) {
        const moduleDecl = tsImportPath.parentPath.parent;
        if (t.isTSModuleDeclaration(moduleDecl)) {
          const moduleDeclPath = tsImportPath.parentPath.parentPath;
          const namespaceParent = moduleDeclPath.parent;
          isInTopLevelNamespace =
            namespaceParent === programPath.node ||
            (t.isExportNamedDeclaration(namespaceParent) &&
              moduleDeclPath.parentPath.parent === programPath.node);
        }
      }

      if (isTopLevel || isInTopLevelNamespace) {
        checkForImportUsage(tsImportPath);
      }
    },

    // Top-level variable declarations
    VariableDeclaration(varDeclPath) {
      const isTopLevel =
        varDeclPath.parent === programPath.node ||
        (t.isExportNamedDeclaration(varDeclPath.parent) &&
          varDeclPath.parentPath.parent === programPath.node);

      if (!isTopLevel) {
        return;
      }

      // Skip our own import transformations
      if (
        varDeclPath.node.declarations.some((decl) => decl.init && isSimpleRequireCall(decl.init))
      ) {
        return;
      }

      checkForImportUsage(varDeclPath);
    },

    // Class static properties (initialize when class is defined)
    ClassProperty(classPropPath) {
      if (!classPropPath.node.static) {
        return;
      }

      const classBody = classPropPath.parent;
      if (!t.isClassBody(classBody)) {
        return;
      }

      const classDecl = classPropPath.parentPath.parent;
      if (!t.isClassDeclaration(classDecl)) {
        return;
      }

      const classDeclPath = classPropPath.parentPath.parentPath;
      const classParent = classDeclPath.parent;

      const isTopLevel =
        classParent === programPath.node ||
        (t.isExportDefaultDeclaration(classParent) &&
          classDeclPath.parentPath.parent === programPath.node) ||
        (t.isExportNamedDeclaration(classParent) &&
          classDeclPath.parentPath.parent === programPath.node);

      if (isTopLevel && classPropPath.node.value) {
        checkForImportUsage(classPropPath);
      }
    },
  });

  return importsUsedInModuleLevelCode;
}

module.exports = {
  isInTypeContext,
  shouldSkipIdentifier,
  detectModuleLevelUsage,
  detectJsxUsage,
  detectJestMockUsage,
};
