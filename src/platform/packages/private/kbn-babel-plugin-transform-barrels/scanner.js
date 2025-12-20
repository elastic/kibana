/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fg = require('fast-glob');
const path = require('path');
const { readFile } = require('fs/promises');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');

/**
 * Get parser plugins based on file extension.
 * TypeScript files use 'typescript' plugin, JS files use 'flow' for compatibility.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {import('@babel/parser').ParserPlugin[]} - Array of Babel parser plugins
 */
function getParserPlugins(filePath) {
  /** @type {import('@babel/parser').ParserPlugin[]} */
  const basePlugins = [
    'jsx',
    'decorators-legacy',
    'classProperties',
    ['importAttributes', { deprecatedAssertSyntax: true }], // Handle both old and new syntax
  ];

  if (/\.tsx?$/.test(filePath)) {
    return [...basePlugins, 'typescript'];
  }
  // Use 'flow' for .js/.jsx - compatible with Flow-typed packages and plain JS
  return [...basePlugins, 'flow'];
}

/**
 * Build the barrel index by scanning all index files in the repository.
 * This runs ONCE before the Piscina worker pool is created.
 *
 * @param {string} repoRoot - Absolute path to repository root
 * @returns {Promise<import('./types').BarrelIndex>}
 */
async function buildBarrelIndex(repoRoot) {
  // Find all potential barrel files
  const barrelFiles = await fg('**/index.{ts,tsx,js,jsx}', {
    cwd: repoRoot,
    ignore: [
      // Exclude our own build artifacts, but NOT node_modules dist folders
      'dist/**',
      'target/**',
      'build/**',
      'x-pack/build/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__fixtures__/**',
      '**/__mocks__/**',
    ],
    absolute: true,
    followSymbolicLinks: false,
  });

  /** @type {import('./types').BarrelIndex} */
  const index = {};

  // Process all barrel files in parallel
  await Promise.all(
    barrelFiles.map(async (barrelPath) => {
      try {
        const content = await readFile(barrelPath, 'utf-8');
        const exports = parseBarrelExports(content, barrelPath);

        // Only add to index if it has re-exports (is actually a barrel file)
        if (Object.keys(exports).length > 0) {
          /** @type {import('./types').BarrelFileEntry} */
          const entry = { exports };

          // Detect if this is a node_modules package and extract package info
          const nodeModulesMatch = barrelPath.match(/node_modules\/((?:@[^/]+\/[^/]+)|[^/]+)/);
          if (nodeModulesMatch) {
            entry.packageName = nodeModulesMatch[1];
            const nodeModulesIdx = barrelPath.indexOf('node_modules/');
            entry.packageRoot = barrelPath.slice(
              0,
              nodeModulesIdx + 'node_modules/'.length + nodeModulesMatch[1].length
            );
          }

          index[barrelPath] = entry;
        }
      } catch (err) {
        // Skip files that can't be parsed
        console.warn(`[barrel-transform] Skipping ${barrelPath}: ${err.message}`);
      }
    })
  );

  return index;
}

/**
 * Parse a barrel file and extract all its exports with resolved paths.
 *
 * @param {string} content - File content
 * @param {string} filePath - Absolute path to the file
 * @returns {Record<string, import('./types').ExportInfo>}
 */
function parseBarrelExports(content, filePath) {
  const ast = parser.parse(content, {
    sourceType: 'unambiguous',
    plugins: getParserPlugins(filePath),
    allowReturnOutsideFunction: true,
  });

  const barrelDir = path.dirname(filePath);
  /** @type {Record<string, import('./types').ExportInfo>} */
  const exports = {};

  // For CommonJS: track require() calls to map variable names to paths
  // e.g., var Observable_1 = require("./internal/Observable");
  /** @type {Record<string, string>} */
  const requireMap = {};

  traverse(ast, {
    // Handle: export { Foo, Bar as Baz } from './source'
    ExportNamedDeclaration(nodePath) {
      const node = nodePath.node;

      // Only process re-exports (has source)
      if (!node.source) return;

      const sourcePath = node.source.value;
      const resolvedPath = resolveModulePath(sourcePath, barrelDir);

      if (!resolvedPath) return;

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ExportSpecifier') {
          const exported = specifier.exported;
          const exportedName = exported.type === 'Identifier' ? exported.name : exported.value;
          const localName = specifier.local.name;

          exports[exportedName] = {
            path: resolvedPath,
            type: 'named',
            localName: localName,
            importedName: localName,
          };
        }
      }
    },

    // Handle: export * from './source'
    ExportAllDeclaration(nodePath) {
      const node = nodePath.node;
      const sourcePath = node.source.value;
      const resolvedPath = resolveModulePath(sourcePath, barrelDir);

      if (!resolvedPath) return;

      // For `export *`, we need to parse the source file to get all exports
      // This is done synchronously within the async context (acceptable here)
      try {
        const sourceContent = fs.readFileSync(resolvedPath, 'utf-8');
        const sourceExports = extractDirectExports(sourceContent, resolvedPath);

        for (const [name, info] of Object.entries(sourceExports)) {
          if (name !== 'default') {
            // export * doesn't re-export default
            exports[name] = info;
          }
        }
      } catch (err) {
        // Skip if source can't be read
      }
    },

    // CommonJS: var X = require('./path')
    VariableDeclarator(nodePath) {
      const node = nodePath.node;
      if (
        node.id.type === 'Identifier' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        node.init.callee.type === 'Identifier' &&
        node.init.callee.name === 'require' &&
        node.init.arguments.length === 1 &&
        node.init.arguments[0].type === 'StringLiteral'
      ) {
        const varName = node.id.name;
        const requirePath = node.init.arguments[0].value;
        const resolvedPath = resolveModulePath(requirePath, barrelDir);
        if (resolvedPath) {
          requireMap[varName] = resolvedPath;
        }
      }
    },

    // CommonJS: Object.defineProperty(exports, "name", { get: function() { return X.localName; } })
    CallExpression(nodePath) {
      const node = nodePath.node;
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'Object' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'defineProperty' &&
        node.arguments.length >= 3 &&
        node.arguments[0].type === 'Identifier' &&
        node.arguments[0].name === 'exports' &&
        node.arguments[1].type === 'StringLiteral'
      ) {
        const exportName = node.arguments[1].value;
        const descriptor = node.arguments[2];

        if (descriptor.type === 'ObjectExpression') {
          // Find the 'get' property
          const getProp = descriptor.properties.find(
            (p) =>
              p.type === 'ObjectProperty' &&
              p.key.type === 'Identifier' &&
              p.key.name === 'get' &&
              p.value.type === 'FunctionExpression'
          );

          if (getProp && getProp.type === 'ObjectProperty') {
            const getterFn = getProp.value;
            if (getterFn.type === 'FunctionExpression' && getterFn.body.body.length === 1) {
              const stmt = getterFn.body.body[0];
              if (stmt.type === 'ReturnStatement' && stmt.argument) {
                const ret = stmt.argument;
                // return X.localName or return X
                if (ret.type === 'MemberExpression' && ret.object.type === 'Identifier') {
                  const varName = ret.object.name;
                  const localName =
                    ret.property.type === 'Identifier' ? ret.property.name : exportName;
                  if (requireMap[varName]) {
                    exports[exportName] = {
                      path: requireMap[varName],
                      type: 'named',
                      localName: localName,
                      importedName: localName,
                    };
                  }
                } else if (ret.type === 'Identifier') {
                  // return X (for default exports)
                  const varName = ret.name;
                  if (requireMap[varName]) {
                    exports[exportName] = {
                      path: requireMap[varName],
                      type: 'named',
                      localName: exportName,
                      importedName: exportName,
                    };
                  }
                }
              }
            }
          }
        }
      }
    },
  });

  return exports;
}

/**
 * Extract direct exports from a source file (for handling export *).
 *
 * @param {string} content - File content
 * @param {string} filePath - Absolute path to the file
 * @returns {Record<string, import('./types').ExportInfo>}
 */
function extractDirectExports(content, filePath) {
  const ast = parser.parse(content, {
    sourceType: 'unambiguous',
    plugins: getParserPlugins(filePath),
    allowReturnOutsideFunction: true,
  });

  /** @type {Record<string, import('./types').ExportInfo>} */
  const exports = {};

  traverse(ast, {
    // export const Foo = ...
    // export function Bar() {}
    // export class Baz {}
    ExportNamedDeclaration(nodePath) {
      const node = nodePath.node;

      // Skip re-exports, only direct exports
      if (node.source) return;

      if (node.declaration) {
        const decl = node.declaration;

        if (decl.type === 'VariableDeclaration') {
          for (const declarator of decl.declarations) {
            if (declarator.id.type === 'Identifier') {
              const name = declarator.id.name;
              exports[name] = {
                path: filePath,
                type: 'named',
                localName: name,
                importedName: name,
              };
            }
          }
        } else if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
          if (decl.id) {
            const name = decl.id.name;
            exports[name] = {
              path: filePath,
              type: 'named',
              localName: name,
              importedName: name,
            };
          }
        } else if (
          decl.type === 'TSTypeAliasDeclaration' ||
          decl.type === 'TSInterfaceDeclaration'
        ) {
          const name = decl.id.name;
          exports[name] = {
            path: filePath,
            type: 'named',
            localName: name,
            importedName: name,
          };
        }
      }

      // export { Foo, Bar }
      if (node.specifiers && !node.source) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ExportSpecifier') {
            const exported = spec.exported;
            const exportedName = exported.type === 'Identifier' ? exported.name : exported.value;
            const localName = spec.local.name;
            exports[exportedName] = {
              path: filePath,
              type: 'named',
              localName: localName,
              importedName: localName,
            };
          }
        }
      }
    },

    // export default ...
    ExportDefaultDeclaration(nodePath) {
      const node = nodePath.node;
      let localName = 'default';

      if (node.declaration) {
        const decl = node.declaration;
        if (decl.type === 'Identifier') {
          localName = decl.name;
        } else if (
          (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') &&
          decl.id
        ) {
          localName = decl.id.name;
        }
      }

      exports.default = {
        path: filePath,
        type: /** @type {const} */ ('default'),
        localName: localName,
        importedName: 'default',
      };
    },
  });

  return exports;
}

/**
 * Resolve a module path to an absolute file path.
 *
 * @param {string} modulePath - The import path (e.g., './foo')
 * @param {string} fromDir - Directory to resolve from
 * @returns {string | null} - Absolute path or null if not found
 */
function resolveModulePath(modulePath, fromDir) {
  // Only handle relative imports
  if (!modulePath.startsWith('.')) {
    return null;
  }

  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];

  const basePath = path.resolve(fromDir, modulePath);

  // Try with each extension
  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  // Try as directory with index file
  for (const ext of extensions) {
    if (ext === '') continue;
    const indexPath = path.join(basePath, 'index' + ext);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

module.exports = { buildBarrelIndex };
