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
 * Check if an expression is a direct require() call with a string literal
 * @param {import('@babel/types').Node} node - AST node to check
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if node is a simple require call
 */
function isSimpleRequireCall(node, t) {
  return (
    t.isCallExpression(node) &&
    t.isIdentifier(node.callee, { name: 'require' }) &&
    node.arguments.length === 1 &&
    t.isStringLiteral(node.arguments[0])
  );
}

/**
 * Collect all referenced properties from a node path
 * Traverses the node and finds all identifiers/JSX identifiers that reference tracked properties
 * @param {NodePath} nodePath - AST node path to traverse
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @returns {Set<string>} Set of property names that are referenced
 */
function collectReferencedProperties(nodePath, properties) {
  const referenced = new Set();

  nodePath.traverse({
    Identifier(idPath) {
      const name = idPath.node.name;
      if (properties.has(name) && idPath.isReferencedIdentifier()) {
        referenced.add(name);
      }
    },
    JSXIdentifier(jsxIdPath) {
      const name = jsxIdPath.node.name;
      if (properties.has(name)) {
        referenced.add(name);
      }
    },
  });

  return referenced;
}

/**
 * Exclude imports from transformation by deleting them from the properties map
 * @param {Set<string>} excludedNames - Set of variable names to exclude
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 */
function excludeImports(excludedNames, properties) {
  for (const localName of excludedNames) {
    properties.delete(localName);
  }
}

/**
 * Ensure a module entry exists in the modules map
 * @param {string} modulePath - The module path
 * @param {Map<string, ModuleInfo>} modules - Map of module info
 * @param {Object} scope - Babel scope for generating unique identifiers
 * @param {import('@babel/types').Node | null} outerFunc - Optional wrapper function
 */
function ensureModule(modulePath, modules, scope, outerFunc = null) {
  if (!modules.has(modulePath)) {
    modules.set(modulePath, {
      cacheId: scope.generateUidIdentifier(`module`),
      requirePath: modulePath,
      outerFunc,
    });
  }
}

/**
 * Collect direct re-export sources from a program
 * Returns a Set of module paths that are directly re-exported (export { x } from './module')
 * @param {NodePath} programPath - The program path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of module paths that are directly re-exported
 */
function collectDirectReExportSources(programPath, t) {
  const directReExportSources = new Set();
  programPath.traverse({
    ExportNamedDeclaration(exportPath) {
      if (exportPath.node.source && t.isStringLiteral(exportPath.node.source)) {
        directReExportSources.add(exportPath.node.source.value);
      }
    },
  });
  return directReExportSources;
}

/**
 * Check if an import has the import-then-export pattern
 * Detects when imported variables are later exported (e.g., import X then export X)
 * @param {NodePath} importPath - The import declaration path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if any import specifier is later exported
 */
function hasImportThenExportPattern(importPath, t) {
  return importPath.node.specifiers.some((specifier) => {
    const binding = importPath.scope.getBinding(specifier.local.name);
    return binding?.referencePaths.some(
      (refPath) =>
        refPath.isReferencedIdentifier() &&
        (t.isExportSpecifier(refPath.parent) ||
          t.isExportDefaultDeclaration(refPath.parent) ||
          t.isExportNamedDeclaration(refPath.parent))
    );
  });
}

/**
 * Check if an identifier is in a TypeScript type-only context
 * Returns true if the identifier is in a pure type context that won't exist at runtime
 * @param {NodePath} path - AST node path to check
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if in type-only context
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
        t.isTSExpressionWithTypeArguments(parentNode) ||
        t.isTSDeclareMethod(parentNode) ||
        t.isTSMethodSignature(parentNode) ||
        t.isTSDeclareFunction(parentNode) ||
        t.isTSFunctionType(parentNode) ||
        t.isTSConstructSignatureDeclaration(parentNode) ||
        t.isTSCallSignatureDeclaration(parentNode))
    ) {
      return true;
    }

    currentPath = currentPath.parentPath;
  }

  return false;
}

/**
 * Check if identifier is in a declaration position (being defined)
 * @param {NodePath} path - The identifier path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if identifier is being declared
 */
function isDeclarationPosition(path, t) {
  return (
    (t.isVariableDeclarator(path.parent) && path.parent.id === path.node) ||
    (t.isFunctionDeclaration(path.parent) && path.parent.id === path.node)
  );
}

/**
 * Check if identifier is in an import/export specifier
 * @param {NodePath} path - The identifier path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if in import/export specifier
 */
function isImportExportSpecifier(path, t) {
  return (
    t.isExportSpecifier(path.parent) ||
    t.isImportSpecifier(path.parent) ||
    t.isImportDefaultSpecifier(path.parent) ||
    t.isImportNamespaceSpecifier(path.parent) ||
    t.isTSImportEqualsDeclaration(path.parent)
  );
}

/**
 * Check if identifier is a non-computed property key (object or class)
 * @param {NodePath} path - The identifier path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if identifier is a non-computed property key
 */
function isNonComputedPropertyKey(path, t) {
  const parent = path.parent;
  const isKey = parent.key === path.node;
  const isNonComputed = !parent.computed;

  return (
    isKey &&
    isNonComputed &&
    (t.isObjectProperty(parent) ||
      t.isObjectMethod(parent) ||
      t.isClassMethod(parent) ||
      t.isClassProperty(parent))
  );
}

/**
 * Check if identifier is a member expression property (e.g., 'bar' in 'foo.bar')
 * @param {NodePath} path - The identifier path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if identifier is a member expression property
 */
function isMemberExpressionProperty(path, t) {
  const parent = path.parent;
  return (
    (t.isMemberExpression(parent) || t.isOptionalMemberExpression(parent)) &&
    parent.property === path.node &&
    !parent.computed
  );
}

/**
 * Check if identifier is shadowed by a local variable
 * @param {NodePath} path - The identifier path
 * @param {NodePath} programPath - The program path
 * @returns {boolean} True if identifier is shadowed
 */
function isShadowedVariable(path, programPath) {
  const binding = path.scope.getBinding(path.node.name);
  return binding && binding.scope !== programPath.scope;
}

/**
 * Determines if a variable name occurrence should NOT be transformed to lazy access
 *
 * When we see a variable name like "foo" in the code, we need to decide if we should
 * transform it to "_imports.foo" (lazy access) or leave it alone.
 *
 * @param {NodePath} path - The AST path for the variable name occurrence
 * @param {Map<string, PropertyInfo>} properties - Map of imported variable names we're tracking
 * @param {NodePath} programPath - The root program path
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {boolean} True if we should NOT transform this occurrence
 */
function shouldSkipIdentifier(path, properties, programPath, t) {
  const varName = path.node.name;

  // Skip if not one of our tracked imports OR if in a non-reference position
  return (
    !properties.has(varName) ||
    isDeclarationPosition(path, t) ||
    isImportExportSpecifier(path, t) ||
    isNonComputedPropertyKey(path, t) ||
    isMemberExpressionProperty(path, t) ||
    isInTypeContext(path, t) ||
    isShadowedVariable(path, programPath)
  );
}

/**
 * Detect which imports are used in JSX syntax anywhere in the file
 * Returns a Set of variable names that should not be lazy-loaded
 * JSX transforms happen at compile time, so components need to be directly available
 * @param {NodePath} programPath - The program path
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of variable names used in JSX
 */
function detectJsxUsage(programPath, properties, t) {
  const importsUsedInJsx = new Set();

  programPath.traverse({
    JSXIdentifier(jsxIdPath) {
      const name = jsxIdPath.node.name;
      // Only element names, not attributes
      // Example: <MyComponent foo="bar" />  ← "MyComponent" yes, "foo" no
      if (
        properties.has(name) &&
        (t.isJSXOpeningElement(jsxIdPath.parent) || t.isJSXClosingElement(jsxIdPath.parent))
      ) {
        importsUsedInJsx.add(name);
      }
    },
    JSXMemberExpression(jsxMemberPath) {
      // Handle cases like <Context.Provider> or <Module.Component>
      // We need to mark the root object (Context, Module) as used in JSX
      if (
        t.isJSXOpeningElement(jsxMemberPath.parent) ||
        t.isJSXClosingElement(jsxMemberPath.parent)
      ) {
        // Find the root identifier (Context in Context.Provider.Something)
        let current = jsxMemberPath.node;
        while (t.isJSXMemberExpression(current.object)) {
          current = current.object;
        }
        if (t.isJSXIdentifier(current.object)) {
          const name = current.object.name;
          if (properties.has(name)) {
            importsUsedInJsx.add(name);
          }
        }
      }
    },
  });

  return importsUsedInJsx;
}

/**
 * Detect which imports are used in jest.mock() factory functions
 * Returns a Set of variable names that should not be lazy-loaded
 * Jest mock factories cannot reference out-of-scope variables
 * @param {NodePath} programPath - The program path
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of variable names used in jest.mock factories
 */
function detectJestMockUsage(programPath, properties, t) {
  const importsUsedInJestMocks = new Set();

  programPath.traverse({
    CallExpression(callPath) {
      const { callee } = callPath.node;

      // Check if this is a jest.mock(), jest.doMock(), or jest.unmock() call
      let isJestMock = false;
      if (t.isMemberExpression(callee)) {
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

      const factoryArg = callPath.node.arguments[1];
      if (!factoryArg) {
        return;
      }

      const factoryPath = callPath.get('arguments.1');
      if (!factoryPath) {
        return;
      }

      const referenced = collectReferencedProperties(factoryPath, properties);
      for (const name of referenced) {
        importsUsedInJestMocks.add(name);
      }
    },
  });

  return importsUsedInJestMocks;
}

/**
 * Detect which imports are used in module-level code that runs at initialization
 * Returns a Set of variable names that should not be lazy-loaded
 * @param {NodePath} programPath - The program path
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of variable names used in module-level code
 */
function detectModuleLevelUsage(programPath, properties, t) {
  const importsUsedInModuleLevelCode = new Set();

  programPath.traverse({
    // TypeScript import alias at module level
    // Example: export import Foo = Bar.Baz;
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
        const referenced = collectReferencedProperties(tsImportPath, properties);
        for (const name of referenced) {
          importsUsedInModuleLevelCode.add(name);
        }
      }
    },

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
        varDeclPath.node.declarations.some((decl) => decl.init && isSimpleRequireCall(decl.init, t))
      ) {
        return;
      }

      const referenced = collectReferencedProperties(varDeclPath, properties);
      for (const name of referenced) {
        importsUsedInModuleLevelCode.add(name);
      }
    },

    // Class static properties execute at class definition time, not instantiation
    // Example: class Foo { static config = loadConfig(); }  ← runs immediately
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
        const referenced = collectReferencedProperties(classPropPath, properties);
        for (const name of referenced) {
          importsUsedInModuleLevelCode.add(name);
        }
      }
    },
  });

  return importsUsedInModuleLevelCode;
}

/**
 * Helper function to extract the root identifier from a node.
 * Handles both simple identifiers and member expression chains.
 * Examples:
 *   - Foo => 'Foo'
 *   - ns.Foo => 'ns'
 *   - ns.sub.Foo => 'ns'
 * @param {import('@babel/types').Node} node - AST node to extract from
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {string | null} The root identifier name or null if not found
 */
function getRootIdentifierFromNode(node, t) {
  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isMemberExpression(node)) {
    // Walk up chain to find root: ns.sub.Foo → ns
    let current = node;
    while (t.isMemberExpression(current.object)) {
      current = current.object;
    }
    if (t.isIdentifier(current.object)) {
      return current.object.name;
    }
    if (t.isIdentifier(current)) {
      return current.name;
    }
  }
  return null;
}

/**
 * Collect root identifiers from all `new` expressions within a node path
 * Example: in `new Validator()` or `new ns.Logger()`, collects the root ("Validator", "ns")
 * @param {NodePath} nodePath - The node path to traverse
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of root variable names used with `new`
 */
function collectNewExpressionRoots(nodePath, properties, t) {
  const roots = new Set();
  nodePath.traverse({
    NewExpression(newPath) {
      const root = getRootIdentifierFromNode(newPath.node.callee, t);
      if (root && properties.has(root)) {
        roots.add(root);
      }
    },
  });
  return roots;
}

/**
 * Detect which imports are used as constructors via `new` anywhere in the file
 * Returns a Set of variable names that should not be lazy-loaded
 *
 * Handles:
 *   - new Foo()
 *   - new ns.Foo()
 *   - new ns.sub.Foo()
 * @param {NodePath} programPath - The program path
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of variable names used as constructors
 */
function detectConstructorUsage(programPath, properties, t) {
  return collectNewExpressionRoots(programPath, properties, t);
}

/**
 * Detect imports used via `new` inside a class constructor or inside class methods
 * that are directly invoked from the constructor (one hop).
 * Returns a Set of variable names that should not be lazy-loaded.
 * @param {NodePath} programPath - The program path
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of variable names constructed in constructor init flow
 */
function detectConstructorInitNewUsage(programPath, properties, t) {
  const importsUsedInConstructorFlow = new Set();

  programPath.traverse({
    ClassDeclaration(classPath) {
      const body = classPath.get('body.body');
      if (!Array.isArray(body)) return;

      const methodsByName = new Map();
      for (const el of body) {
        if (el.isClassMethod() && t.isIdentifier(el.node.key)) {
          methodsByName.set(el.node.key.name, el);
        }
      }

      const constructorMethod = methodsByName.get('constructor');
      if (!constructorMethod) return;

      // Collect `new` expressions directly in constructor
      // Example: constructor() { this.x = new Validator(); }  ← marks Validator
      const constructorNewExpressions = collectNewExpressionRoots(constructorMethod, properties, t);
      constructorNewExpressions.forEach((name) => importsUsedInConstructorFlow.add(name));

      // Find methods called by constructor: this.setup(), this.init(), etc.
      const calledMethodNames = new Set();
      constructorMethod.traverse({
        CallExpression(callPath) {
          const callee = callPath.node.callee;
          if (
            t.isMemberExpression(callee) &&
            t.isThisExpression(callee.object) &&
            t.isIdentifier(callee.property)
          ) {
            calledMethodNames.add(callee.property.name);
          }
        },
      });

      // One-hop analysis: check those called methods for `new` expressions
      // Example: setup() { this.logger = new Logger(); }  ← marks Logger
      for (const name of calledMethodNames) {
        const methodPath = methodsByName.get(name);
        if (methodPath) {
          const methodNewExpressions = collectNewExpressionRoots(methodPath, properties, t);
          methodNewExpressions.forEach((name) => importsUsedInConstructorFlow.add(name));
        }
      }
    },
  });

  return importsUsedInConstructorFlow;
}

/**
 * Detect imports used in class extends clauses
 * Returns a Set of variable names that should not be lazy-loaded
 *
 * Classes need their parent class available at definition time, not instantiation time.
 * Example: class Foo extends Bar needs Bar to be eagerly loaded.
 * @param {NodePath} programPath - The program path
 * @param {Map<string, PropertyInfo>} properties - Map of tracked properties
 * @param {import('@babel/types')} t - Babel types helper
 * @returns {Set<string>} Set of variable names used in class extends
 */
function detectClassExtendsUsage(programPath, properties, t) {
  const importsUsedInExtends = new Set();

  programPath.traverse({
    ClassDeclaration(classPath) {
      const superClass = classPath.node.superClass;
      if (superClass) {
        const rootName = getRootIdentifierFromNode(superClass, t);
        if (rootName && properties.has(rootName)) {
          importsUsedInExtends.add(rootName);
        }
      }
    },
    ClassExpression(classPath) {
      const superClass = classPath.node.superClass;
      if (superClass) {
        const rootName = getRootIdentifierFromNode(superClass, t);
        if (rootName && properties.has(rootName)) {
          importsUsedInExtends.add(rootName);
        }
      }
    },
  });

  return importsUsedInExtends;
}

module.exports = {
  isSimpleRequireCall,
  collectReferencedProperties,
  excludeImports,
  ensureModule,
  collectDirectReExportSources,
  hasImportThenExportPattern,
  isInTypeContext,
  shouldSkipIdentifier,
  detectModuleLevelUsage,
  detectJsxUsage,
  detectJestMockUsage,
  detectConstructorUsage,
  detectConstructorInitNewUsage,
  detectClassExtendsUsage,
};
