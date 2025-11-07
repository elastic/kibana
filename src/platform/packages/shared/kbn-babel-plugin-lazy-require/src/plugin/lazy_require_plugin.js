/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Babel plugin that transforms top-level require() and import statements into lazy-loaded getters.
 * See README.md for detailed examples and documentation.
 */

const {
  isSimpleRequireCall,
  shouldSkipIdentifier,
  detectModuleLevelUsage,
  detectJsxUsage,
  detectJestMockUsage,
  detectConstructorUsage,
  detectConstructorInitNewUsage,
  detectClassExtendsUsage,
} = require('./helpers');

/**
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/traverse').NodePath} NodePath
 */

/**
 * Information about a module being cached
 * @typedef {Object} ModuleInfo
 * @property {import('@babel/types').Identifier} cacheId - Generated cache variable identifier
 * @property {string} requirePath - Module path to require
 * @property {import('@babel/types').Node | null} outerFunc - Optional wrapper function (e.g., interopRequireDefault)
 */

/**
 * Information about a property/variable imported from a module
 * @typedef {Object} PropertyInfo
 * @property {string} moduleRequirePath - Path to the module this variable imports from
 * @property {string | null} propertyKey - Property name to access (null for namespace/whole module)
 * @property {boolean} isConst - Whether declared with const (vs let/var)
 * @property {boolean} [needsInterop] - Whether needs default import interop wrapper
 * @property {'import' | 'require'} declarationType - Type of declaration
 * @property {NodePath} declarationPath - AST path for removal
 * @property {number} [declarationIndex] - Index in declaration array (for require statements)
 */

// Modules that should never be lazy-loaded
// Supports exact matches ('react') and trailing wildcards ('@testing-library/*')
const EXCLUDED_MODULES = ['react', 'React', '@jest/globals', '@testing-library/*'];

// File patterns for files that should skip transformation
const MOCK_FILE_PATTERNS = ['.mock.', '.mocks.'];
const TEST_MOCK_IMPORT_PATTERNS = ['.test.mocks', '.test.mock'];

// Test file detection patterns
const TEST_DIR_PATTERN = /(^|\/)(__tests__|__test__)(\/|$)/;
const TEST_FILE_PATTERN = /\.(test|spec)\.[tj]sx?$/;

/**
 * Check if a module path matches any exclusion pattern
 * @param {string} modulePath - The module path to check
 * @returns {boolean} True if the module should be excluded from lazy loading
 */
function isExcludedModule(modulePath) {
  return EXCLUDED_MODULES.some((pattern) => {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(modulePath);
  });
}

/**
 * Babel plugin that transforms top-level require() and import statements into lazy-loaded getters
 * @param {Object} api - Babel plugin API
 * @param {BabelTypes} api.types - Babel types helper
 * @returns {import('@babel/core').PluginObj} Babel plugin object
 */
module.exports = function lazyRequirePlugin({ types: t }) {
  return {
    name: 'kbn-lazy-require',
    visitor: {
      Program(programPath, state) {
        // Skip transformation for mock files - they need immediate access to all imports
        // for jest.mock() and jest.doMock() factory functions to work correctly
        const filename = state.filename || state.file.opts.filename || '';
        if (MOCK_FILE_PATTERNS.some((pattern) => filename.includes(pattern))) {
          return;
        }

        const isTestFile = TEST_DIR_PATTERN.test(filename) || TEST_FILE_PATTERN.test(filename);

        // State tracking
        /** @type {Map<string, ModuleInfo>} - Maps module path to cache info */
        const modules = new Map();

        /** @type {Map<string, PropertyInfo>} - Maps local variable name to import/require info */
        const properties = new Map();

        const importsVar = programPath.scope.generateUidIdentifier('imports');

        // =================================================================
        // PHASE 1: Collect require() and import statements, detect exclusions
        // =================================================================

        // Collect direct re-exports (export { x } from './module')
        const directReExportSources = new Set();
        programPath.traverse({
          ExportNamedDeclaration(exportPath) {
            if (exportPath.node.source && t.isStringLiteral(exportPath.node.source)) {
              directReExportSources.add(exportPath.node.source.value);
            }
          },
        });

        // Collect require() and import statements
        programPath.traverse({
          VariableDeclaration(path) {
            if (path.parent !== programPath.node) {
              return;
            }

            const declarations = path.node.declarations;

            for (let i = 0; i < declarations.length; i++) {
              const decl = declarations[i];

              let requirePath = null;
              let outerFunc = null;

              if (isSimpleRequireCall(decl.init, t)) {
                requirePath = decl.init.arguments[0].value;
              } else if (
                t.isCallExpression(decl.init) &&
                decl.init.arguments.length === 1 &&
                isSimpleRequireCall(decl.init.arguments[0], t)
              ) {
                requirePath = decl.init.arguments[0].arguments[0].value;
                outerFunc = decl.init.callee;
              }

              // Skip if we didn't find a require pattern
              if (!requirePath) {
                continue;
              }

              const isConst = path.node.kind === 'const';

              // Ensure module cache exists for this require path
              if (!modules.has(requirePath)) {
                modules.set(requirePath, {
                  cacheId: programPath.scope.generateUidIdentifier(`module`),
                  requirePath,
                  outerFunc,
                });
              }

              if (t.isIdentifier(decl.id)) {
                // Simple assignment: const foo = require('./foo')
                const localName = decl.id.name;
                properties.set(localName, {
                  moduleRequirePath: requirePath,
                  propertyKey: null,
                  isConst,
                  declarationType: 'require',
                  declarationPath: path,
                  declarationIndex: i,
                });
              } else if (t.isObjectPattern(decl.id)) {
                // Destructuring: const { a, b } = require('./foo')
                // Only transform simple patterns (no nesting, rest, computed properties)
                let canTransform = true;
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
                  // All destructured properties share the same declaration
                  for (const prop of decl.id.properties) {
                    const localName = prop.value.name;
                    const propKey = prop.key.name;

                    properties.set(localName, {
                      moduleRequirePath: requirePath,
                      propertyKey: propKey,
                      isConst,
                      declarationType: 'require',
                      declarationPath: path,
                      declarationIndex: i,
                    });
                  }
                }
              }
            }
          },

          ImportDeclaration(path) {
            if (path.parent !== programPath.node) {
              return;
            }

            const importPath = path.node.source.value;

            // Skip imports from directly re-exported modules
            if (directReExportSources.has(importPath)) {
              return;
            }

            const isConst = true;

            // Ensure module cache exists for this import path
            if (!modules.has(importPath)) {
              modules.set(importPath, {
                cacheId: programPath.scope.generateUidIdentifier(`module`),
                requirePath: importPath,
                outerFunc: null, // We'll handle interop manually for imports
              });
            }

            // Skip if any import is re-exported (import then export pattern)
            const hasReExport = path.node.specifiers.some((specifier) => {
              const binding = path.scope.getBinding(specifier.local.name);
              return binding?.referencePaths.some(
                (refPath) =>
                  refPath.isReferencedIdentifier() &&
                  (t.isExportSpecifier(refPath.parent) ||
                    t.isExportDefaultDeclaration(refPath.parent) ||
                    t.isExportNamedDeclaration(refPath.parent))
              );
            });

            if (hasReExport) {
              return;
            }

            // Skip imports from mock files - they contain jest.doMock() setup that must run immediately
            if (TEST_MOCK_IMPORT_PATTERNS.some((pattern) => importPath.includes(pattern))) {
              return;
            }

            // Handle different import types
            for (const specifier of path.node.specifiers) {
              const localName = specifier.local.name;
              let propertyKey = null;
              let needsInterop = false;

              if (t.isImportDefaultSpecifier(specifier)) {
                // import foo from './bar'
                propertyKey = 'default';
                needsInterop = true;
              } else if (t.isImportNamespaceSpecifier(specifier)) {
                // import * as foo from './bar'
                propertyKey = null; // entire module
              } else if (t.isImportSpecifier(specifier)) {
                // import { foo } from './bar' or import { foo as bar } from './bar'
                propertyKey = specifier.imported.name;
              }

              properties.set(localName, {
                moduleRequirePath: importPath,
                propertyKey,
                isConst,
                needsInterop,
                declarationType: 'import',
                declarationPath: path,
              });
            }
          },
        });

        if (properties.size === 0) {
          return;
        }

        // Detect and exclude module-level usage
        const importsUsedInModuleLevelCode = detectModuleLevelUsage(programPath, properties, t);

        // Exclude from transformation (will remain as regular imports/requires)
        for (const localName of importsUsedInModuleLevelCode) {
          properties.delete(localName);
        }

        // Detect and exclude JSX usage
        // JSX transforms happen at compile time, so components need direct access
        const importsUsedInJsx = detectJsxUsage(programPath, properties, t);

        // Exclude JSX components from transformation
        for (const localName of importsUsedInJsx) {
          properties.delete(localName);
        }

        // Exclude modules from the exclusion list
        // Some modules must always be available (e.g., React for JSX, Jest for test structure)
        for (const [localName, propInfo] of properties) {
          if (isExcludedModule(propInfo.moduleRequirePath)) {
            properties.delete(localName);
          }
        }

        // Detect and exclude jest.mock() factory usage
        // Jest mock factories cannot reference out-of-scope variables
        const importsUsedInJestMocks = detectJestMockUsage(programPath, properties, t);

        // Exclude from transformation
        for (const localName of importsUsedInJestMocks) {
          properties.delete(localName);
        }

        // Detect and exclude constructor usage (new Foo(), new ns.Foo()) in test files only.
        // This preserves eager import semantics for constructors in tests to avoid deferring
        // module initialization past jest beforeEach/afterEach hooks (e.g., Date mocking),
        // while keeping non-test files eligible for lazy loading.
        if (isTestFile) {
          const importsUsedAsConstructors = detectConstructorUsage(programPath, properties, t);
          for (const localName of importsUsedAsConstructors) {
            properties.delete(localName);
          }
        }

        // Detect `new` usage inside constructors or methods invoked by constructors (one hop)
        // Keep these eager even in non-test files, as constructor flows generally expect
        // import-time semantics for dependencies used during instantiation.
        const importsUsedInCtorInit = detectConstructorInitNewUsage(programPath, properties, t);
        for (const localName of importsUsedInCtorInit) {
          properties.delete(localName);
        }

        // Detect imports used in class extends clauses
        // Classes need their parent class available at definition time, not instantiation time.
        const importsUsedInExtends = detectClassExtendsUsage(programPath, properties, t);
        for (const localName of importsUsedInExtends) {
          properties.delete(localName);
        }

        // Remove orphaned modules (no properties left)
        const activeModules = new Set(
          Array.from(properties.values()).map((info) => info.moduleRequirePath)
        );
        for (const [modulePath] of modules) {
          if (!activeModules.has(modulePath)) {
            modules.delete(modulePath);
          }
        }

        // If all imports are used in module-level code, nothing to transform
        if (properties.size === 0) {
          return;
        }

        // Collect declaration paths to remove
        const requirePathsToProcess = new Set();
        const importPathsToRemove = new Set();

        for (const [, propInfo] of properties) {
          if (propInfo.declarationType === 'import') {
            importPathsToRemove.add(propInfo.declarationPath);
          } else if (propInfo.declarationType === 'require') {
            requirePathsToProcess.add(propInfo.declarationPath);
          }
        }

        // Handle import removals (can be partial)
        for (const importPath of importPathsToRemove) {
          // Check if ALL specifiers from this import are being transformed
          const specifiers = importPath.node.specifiers;
          const allTransformed = specifiers.every((spec) => {
            const localName = spec.local.name;
            return properties.has(localName);
          });

          if (allTransformed) {
            // Remove the entire import
            importPath.remove();
          } else {
            // Partial removal - only remove the specifiers we're transforming
            const remainingSpecifiers = specifiers.filter((spec) => {
              return !properties.has(spec.local.name);
            });
            importPath.node.specifiers = remainingSpecifiers;
          }
        }

        // Handle require removals
        for (const requirePath of requirePathsToProcess) {
          const declarations = requirePath.node.declarations;
          const indicesToRemove = [];

          for (let i = 0; i < declarations.length; i++) {
            const decl = declarations[i];
            // Check if this declaration should be removed
            let shouldRemove = false;

            if (t.isIdentifier(decl.id) && properties.has(decl.id.name)) {
              shouldRemove = true;
            } else if (t.isObjectPattern(decl.id)) {
              // Check if any property is being transformed
              const allPropsTransformed = decl.id.properties.every((prop) => {
                return (
                  t.isObjectProperty(prop) &&
                  t.isIdentifier(prop.value) &&
                  properties.has(prop.value.name)
                );
              });
              if (allPropsTransformed) {
                shouldRemove = true;
              }
            }

            if (shouldRemove) {
              indicesToRemove.push(i);
            }
          }

          // Remove in reverse order to maintain indices
          for (let i = indicesToRemove.length - 1; i >= 0; i--) {
            declarations.splice(indicesToRemove[i], 1);
          }

          // If all declarations removed, remove the entire statement
          if (declarations.length === 0) {
            requirePath.remove();
          }
        }

        // =================================================================
        // PHASE 2: Replace identifier usages
        // =================================================================
        programPath.traverse({
          Identifier(path) {
            if (shouldSkipIdentifier(path, properties, programPath, t)) {
              return;
            }

            // Replace: foo → _imports.foo
            const localName = path.node.name;
            path.replaceWith(t.memberExpression(importsVar, t.identifier(localName)));
          },
        });

        // =================================================================
        // PHASE 3: Generate module caches
        // =================================================================
        const moduleCacheDeclarations = [];

        for (const [, moduleInfo] of modules) {
          moduleCacheDeclarations.push(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                moduleInfo.cacheId,
                t.objectExpression([
                  t.objectProperty(t.identifier('initialized'), t.booleanLiteral(false)),
                  t.objectProperty(t.identifier('value'), t.identifier('undefined')),
                ])
              ),
            ])
          );
        }

        // =================================================================
        // PHASE 4: Generate _imports object
        // =================================================================

        // Check if we need _interopRequireDefault helper
        let needsInteropHelper = false;
        for (const [, propInfo] of properties) {
          if (propInfo.needsInterop) {
            needsInteropHelper = true;
            break;
          }
        }

        const importProperties = [];

        for (const [localName, propInfo] of properties) {
          const moduleInfo = modules.get(propInfo.moduleRequirePath);
          const cacheId = moduleInfo.cacheId;
          const cacheInitialized = t.memberExpression(cacheId, t.identifier('initialized'));
          const cacheValue = t.memberExpression(cacheId, t.identifier('value'));

          // Build require expression (always store raw module in cache)
          let requireExpression = t.callExpression(t.identifier('require'), [
            t.stringLiteral(propInfo.moduleRequirePath),
          ]);
          if (moduleInfo.outerFunc) {
            requireExpression = t.callExpression(moduleInfo.outerFunc, [requireExpression]);
          }

          // Helper: creates the initialization block (if (!initialized) { load module })
          const createInitBlock = () =>
            t.ifStatement(
              t.unaryExpression('!', cacheInitialized),
              t.blockStatement([
                t.expressionStatement(t.assignmentExpression('=', cacheValue, requireExpression)),
                t.expressionStatement(
                  t.assignmentExpression('=', cacheInitialized, t.booleanLiteral(true))
                ),
              ])
            );

          // Determine return value for getter
          let returnExpression;
          if (propInfo.needsInterop) {
            // Default import: apply interop wrapper
            returnExpression = t.memberExpression(
              t.callExpression(t.identifier('_interopRequireDefault'), [cacheValue]),
              t.identifier('default')
            );
          } else if (propInfo.propertyKey === null) {
            // Namespace import: return entire module
            returnExpression = cacheValue;
          } else {
            // Named import: return specific property
            returnExpression = t.memberExpression(cacheValue, t.identifier(propInfo.propertyKey));
          }

          // Create getter
          importProperties.push(
            t.objectMethod(
              'get',
              t.identifier(localName),
              [],
              t.blockStatement([createInitBlock(), t.returnStatement(returnExpression)])
            )
          );

          // Create setter for let/var (loads module for side effects before replacing)
          if (!propInfo.isConst) {
            importProperties.push(
              t.objectMethod(
                'set',
                t.identifier(localName),
                [t.identifier('newValue')],
                t.blockStatement([
                  createInitBlock(),
                  t.expressionStatement(
                    t.assignmentExpression('=', cacheValue, t.identifier('newValue'))
                  ),
                ])
              )
            );
          }
        }

        // =================================================================
        // PHASE 5: Insert generated code
        // =================================================================

        // Insert _imports object
        programPath.unshiftContainer(
          'body',
          t.variableDeclaration('const', [
            t.variableDeclarator(importsVar, t.objectExpression(importProperties)),
          ])
        );

        // Insert _interopRequireDefault helper if needed for default imports
        if (needsInteropHelper) {
          programPath.unshiftContainer(
            'body',
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('_interopRequireDefault'),
                t.callExpression(t.identifier('require'), [
                  t.stringLiteral('@babel/runtime/helpers/interopRequireDefault'),
                ])
              ),
            ])
          );
        }

        // Insert module cache variables (in reverse to maintain order)
        for (let i = moduleCacheDeclarations.length - 1; i >= 0; i--) {
          programPath.unshiftContainer('body', moduleCacheDeclarations[i]);
        }
      },
    },
  };
};
