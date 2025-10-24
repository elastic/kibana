/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Babel plugin that transforms top-level require() calls into lazy-loaded getters.
 *
 * This plugin defers module loading until the first property access, reducing:
 * - CPU consumption during startup (only load what's used)
 * - Memory usage (smaller require cache, fewer file-level objects)
 * - Babel transformation overhead (fewer files need transforming)
 *
 * @example
 * Input:
 *   const foo = require('./foo');
 *   const { bar, baz } = require('./utils');
 *   foo.doSomething();
 *
 * Output:
 *   const _module_foo = { initialized: false, value: undefined };
 *   const _module_utils = { initialized: false, value: undefined };
 *   const _imports = {
 *     get foo() {
 *       if (!_module_foo.initialized) {
 *         _module_foo.value = require('./foo');
 *         _module_foo.initialized = true;
 *       }
 *       return _module_foo.value;
 *     },
 *     get bar() {
 *       if (!_module_utils.initialized) {
 *         _module_utils.value = require('./utils');
 *         _module_utils.initialized = true;
 *       }
 *       return _module_utils.value.bar;
 *     },
 *     get baz() {
 *       if (!_module_utils.initialized) {
 *         _module_utils.value = require('./utils');
 *         _module_utils.initialized = true;
 *       }
 *       return _module_utils.value.baz;
 *     }
 *   };
 *   _imports.foo.doSomething();
 *
 * Note: require('./utils') is only called once even though both bar and baz
 * share the same module cache (_module_utils).
 */

module.exports = function lazyRequirePlugin({ types: t }) {
  /**
   * Check if an expression is a direct require() call with a string literal
   */
  function isSimpleRequireCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'require' }) &&
      node.arguments.length === 1 &&
      t.isStringLiteral(node.arguments[0])
    );
  }

  return {
    name: 'kbn-lazy-require',
    visitor: {
      Program(programPath) {
        // Track modules by their require path (for shared caching)
        const modules = new Map();

        // Track properties by their variable name (what the user accesses)
        const properties = new Map();

        // Generate unique identifier for imports object
        const importsVar = programPath.scope.generateUidIdentifier('imports');

        // ============================================================
        // PHASE 1: Collect all top-level require declarations
        // ============================================================
        programPath.traverse({
    VariableDeclaration(path) {
            // Only transform top-level declarations
            if (path.parent !== programPath.node) {
        return;
      }

            const declarations = path.node.declarations;
            const declarationsToRemove = [];

            for (let i = 0; i < declarations.length; i++) {
              const decl = declarations[i];

              // Skip if not a require call
              if (!isSimpleRequireCall(decl.init)) {
                continue;
              }

              const requirePath = decl.init.arguments[0].value;
              const isConst = path.node.kind === 'const';

              // Ensure module cache exists for this require path
              if (!modules.has(requirePath)) {
                modules.set(requirePath, {
                  cacheId: programPath.scope.generateUidIdentifier(`module`),
                  requirePath,
                });
              }

              // Handle different declaration patterns
              if (t.isIdentifier(decl.id)) {
                // Simple: const foo = require('./foo')
                const varName = decl.id.name;
                properties.set(varName, {
                  moduleRequirePath: requirePath,
                  propertyKey: null, // null = return entire module
                  isConst,
                });
                declarationsToRemove.push(i);
              } else if (t.isObjectPattern(decl.id)) {
                // Destructured: const { a, b } = require('./foo')
                let canTransform = true;

                // Verify all properties are simple identifier patterns
                for (const prop of decl.id.properties) {
                  if (
                    !t.isObjectProperty(prop) ||
                    !t.isIdentifier(prop.key) ||
                    !t.isIdentifier(prop.value) ||
                    prop.computed
                  ) {
                    canTransform = false;
                    break;
                  }
                }

                if (canTransform) {
                  for (const prop of decl.id.properties) {
                    const varName = prop.value.name;
                    const propKey = prop.key.name;

                    properties.set(varName, {
                      moduleRequirePath: requirePath,
                      propertyKey: propKey,
                      isConst,
                    });
                  }
                  declarationsToRemove.push(i);
                }
              }
            }

            // Remove transformed declarations from the original statement
            if (declarationsToRemove.length > 0) {
              // Remove in reverse order to maintain indices
              for (let i = declarationsToRemove.length - 1; i >= 0; i--) {
                declarations.splice(declarationsToRemove[i], 1);
              }

              // If all declarations removed, remove the entire statement
              if (declarations.length === 0) {
                path.remove();
              }
            }
          },
        });

        // If no requires found, nothing to transform
        if (properties.size === 0) {
          return;
        }

        // ============================================================
        // PHASE 2: Replace all usages with _imports.propertyName
        // ============================================================
        programPath.traverse({
          Identifier(path) {
            const varName = path.node.name;

            // Skip if this identifier is not one of our tracked properties
            if (!properties.has(varName)) {
              return;
            }

            // Skip variable/function declarations
            if (
              (t.isVariableDeclarator(path.parent) && path.parent.id === path.node) ||
              (t.isFunctionDeclaration(path.parent) && path.parent.id === path.node)
            ) {
              return;
            }

            // Skip object property keys (non-computed)
            if (
              (t.isObjectProperty(path.parent) || t.isObjectMethod(path.parent)) &&
              path.parent.key === path.node &&
              !path.parent.computed
      ) {
        return;
      }

            // Skip member expression properties (e.g., 'bar' in 'foo.bar')
      if (
        t.isMemberExpression(path.parent) &&
        path.parent.property === path.node &&
        !path.parent.computed
      ) {
        return;
      }

            // Skip class method/property keys
      if (
              (t.isClassMethod(path.parent) || t.isClassProperty(path.parent)) &&
              path.parent.key === path.node &&
              !path.parent.computed
      ) {
        return;
      }

            // Check scope: only replace if binding is from program scope
            const binding = path.scope.getBinding(varName);
            if (binding && binding.scope !== programPath.scope) {
              // This is a local variable shadowing our import, don't replace
        return;
      }

            // Replace: foo → _imports.foo
            path.replaceWith(
              t.memberExpression(importsVar, t.identifier(varName))
            );
          },
        });

        // ============================================================
        // PHASE 3: Generate module cache variables
        // ============================================================
        const moduleCacheDeclarations = [];

        for (const [requirePath, moduleInfo] of modules) {
          moduleCacheDeclarations.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(
                moduleInfo.cacheId,
              t.objectExpression([
                  t.objectProperty(
                    t.identifier('initialized'),
                    t.booleanLiteral(false)
                  ),
                  t.objectProperty(
                    t.identifier('value'),
                    t.identifier('undefined')
                  ),
                ])
              ),
            ])
          );
        }

        // ============================================================
        // PHASE 4: Generate _imports object with getters/setters
        // ============================================================
        const importProperties = [];

        for (const [varName, propInfo] of properties) {
          const moduleInfo = modules.get(propInfo.moduleRequirePath);
          const cacheId = moduleInfo.cacheId;

          // Build the require expression: require('path')
          const requireCall = t.callExpression(
            t.identifier('require'),
            [t.stringLiteral(propInfo.moduleRequirePath)]
          );

          // References to cache fields
          const cacheInitialized = t.memberExpression(
            cacheId,
            t.identifier('initialized')
          );
          const cacheValue = t.memberExpression(
            cacheId,
            t.identifier('value')
          );

          // Determine what to return from getter
          let returnExpression;
          if (propInfo.propertyKey === null) {
            // Full module: return _module_foo.value
            returnExpression = cacheValue;
          } else {
            // Destructured property: return _module_foo.value.propertyKey
            returnExpression = t.memberExpression(
              cacheValue,
              t.identifier(propInfo.propertyKey)
            );
          }

          // Create getter
          importProperties.push(
            t.objectMethod(
              'get',
              t.identifier(varName),
              [],
              t.blockStatement([
                // if (!_module_foo.initialized) {
                t.ifStatement(
                  t.unaryExpression('!', cacheInitialized),
                  t.blockStatement([
                    // _module_foo.value = require('...');
                    t.expressionStatement(
                      t.assignmentExpression('=', cacheValue, requireCall)
                    ),
                    // _module_foo.initialized = true;
                    t.expressionStatement(
                      t.assignmentExpression('=', cacheInitialized, t.booleanLiteral(true))
                    ),
                  ])
                ),
                // return _module_foo.value (or .value.prop)
                t.returnStatement(returnExpression),
              ])
            )
          );

          // Create setter for non-const declarations
          if (!propInfo.isConst) {
            importProperties.push(
              t.objectMethod(
                'set',
                t.identifier(varName),
                [t.identifier('newValue')],
                t.blockStatement([
                  // Ensure module is loaded first (for side effects)
                  t.ifStatement(
                    t.unaryExpression('!', cacheInitialized),
                    t.blockStatement([
                      t.expressionStatement(
                        t.assignmentExpression('=', cacheValue, requireCall)
                      ),
                      t.expressionStatement(
                        t.assignmentExpression('=', cacheInitialized, t.booleanLiteral(true))
                      ),
                    ])
                  ),
                  // Now set the value
                  t.expressionStatement(
                    t.assignmentExpression('=', cacheValue, t.identifier('newValue'))
                  ),
                ])
              )
            );
          }
        }

        // ============================================================
        // PHASE 5: Insert generated code at top of file
        // ============================================================

        // Insert _imports object
        programPath.unshiftContainer(
        'body',
        t.variableDeclaration('const', [
            t.variableDeclarator(
              importsVar,
              t.objectExpression(importProperties)
            ),
          ])
        );

        // Insert module cache variables (in reverse to maintain order)
        for (let i = moduleCacheDeclarations.length - 1; i >= 0; i--) {
          programPath.unshiftContainer('body', moduleCacheDeclarations[i]);
        }
      },
    },
  };
};
