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
 * Cache for parsed file exports to avoid re-parsing the same file multiple times.
 * Maps filePath -> Map<exportName, { path: string, localName: string, isDefault: boolean }>
 * @type {Map<string, Map<string, { path: string, localName: string, isDefault: boolean }>>}
 */
const exportSourceCache = new Map();

/**
 * @typedef {Object} ExportsReverseMapEntry
 * @property {string} subpathPattern - The public subpath pattern (e.g., './internal/*')
 * @property {RegExp} fileRegex - Regex to match file paths
 * @property {boolean} hasWildcard - Whether the pattern contains a wildcard
 */

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
 * Resolve the barrel file path from a package.json.
 * Uses the exports field root or main field to find the entry point.
 *
 * @param {string} packageRoot - Absolute path to package root
 * @param {Record<string, any>} pkgJson - Parsed package.json content
 * @returns {string | null} - Absolute path to barrel file or null
 */
function resolvePackageBarrel(packageRoot, pkgJson) {
  let barrelRelPath = null;

  // Try exports field first (root entry ".")
  if (pkgJson.exports) {
    const rootExport = pkgJson.exports['.'];
    if (rootExport) {
      barrelRelPath = extractFileTarget(rootExport);
    }
  }

  // Fall back to main field
  if (!barrelRelPath && pkgJson.main) {
    barrelRelPath = pkgJson.main;
  }

  // Default to index if nothing specified - try multiple extensions
  if (!barrelRelPath) {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    for (const ext of extensions) {
      const candidate = path.resolve(packageRoot, 'index' + ext);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return fs.realpathSync(candidate);
      }
    }
    return null;
  }

  // Some entry points are JSON, .d.ts or binary files, so we need to skip them
  const isParseableFile = /(?<!\.d)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(barrelRelPath);
  if (!isParseableFile) {
    return null;
  }

  // Resolve to absolute path
  const barrelPath = path.resolve(packageRoot, barrelRelPath);

  // Verify file exists
  if (fs.existsSync(barrelPath) && fs.statSync(barrelPath).isFile()) {
    return fs.realpathSync(barrelPath); // Normalize symlinks to match require.resolve
  }

  return null;
}

/**
 * Check if a package has subpath exports (beyond just root and package.json).
 *
 * @param {Record<string, any>} exportsField - The exports field from package.json
 * @returns {boolean} - True if package has subpath exports
 */
function hasSubpathExports(exportsField) {
  return Object.keys(exportsField).some((key) => key !== '.' && key !== './package.json');
}

/**
 * Build the barrel index by scanning all barrel files.
 * This runs ONCE before the Piscina worker pool is created.
 *
 * Uses two scans:
 * 1. node_modules packages (with packageName for proper import paths)
 * 2. Internal barrel files within packages (for relative import transforms)
 *
 * @param {string} repoRoot - Absolute path to repository root
 * @returns {Promise<import('./types').BarrelIndex>}
 */
async function buildBarrelIndex(repoRoot) {
  /** @type {import('./types').BarrelIndex} */
  const index = {};

  // Step 1: Find files in parallel
  const [kibanaBarrels, packageJsonFiles] = await Promise.all([
    // Internal barrel files (exclude node_modules)
    fg('**/index.{ts,tsx,js,jsx}', {
      cwd: repoRoot,
      ignore: [
        'node_modules/**',
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
    }),
    // node_modules package.json files
    fg('node_modules/{*,@*/*}/package.json', {
      cwd: repoRoot,
      absolute: true,
      followSymbolicLinks: true,
    }),
  ]);

  // Step 2: Process node_modules FIRST (has packageName for proper import paths)
  await Promise.all(
    packageJsonFiles.map(async (pkgJsonPath) => {
      try {
        const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
        const pkgJson = JSON.parse(pkgJsonContent);
        const packageRoot = path.dirname(pkgJsonPath);
        const packageName = pkgJson.name;

        // Skip packages without a name
        if (!packageName) return;

        const pkgExports = pkgJson.exports;

        // Check exports field to determine if transforms are possible
        if (pkgExports) {
          // If package has exports but only root export, skip entirely
          // No valid subpath transforms are possible
          if (!hasSubpathExports(pkgExports)) {
            return;
          }
        }

        // Find barrel file path (normalized via realpathSync for symlinks)
        const barrelPath = resolvePackageBarrel(packageRoot, pkgJson);
        if (!barrelPath) return;

        // Normalize packageRoot to real path to match the resolved barrelPath.
        // This is necessary because barrelPath uses realpathSync (for symlinks like @kbn/*)
        // and exports are resolved relative to it, so packageRoot must also be real path
        // for path.relative() to work correctly in the transformer.
        const normalizedPackageRoot = fs.realpathSync(packageRoot);

        // Parse barrel with context available
        const content = await readFile(barrelPath, 'utf-8');
        const exports = parseBarrelExports(content, barrelPath);

        if (Object.keys(exports).length > 0) {
          /** @type {import('./types').BarrelFileEntry} */
          const entry = { exports, packageName, packageRoot: normalizedPackageRoot };

          // Build reverse map and compute publicSubpath for each export
          if (pkgExports) {
            const reverseMap = buildExportsReverseMap(pkgExports);

            // Filter exports to only include those with valid publicSubpath
            // Exports without publicSubpath would violate the exports field restrictions
            /** @type {Record<string, import('./types').ExportInfo>} */
            const validExports = {};

            for (const [exportName, exportInfo] of Object.entries(exports)) {
              const relativePath = path.relative(normalizedPackageRoot, exportInfo.path);
              const publicSubpath = resolvePublicSubpath(relativePath, reverseMap);
              if (publicSubpath !== null) {
                exportInfo.publicSubpath = publicSubpath;
                validExports[exportName] = exportInfo;
              }
              // Exports without valid publicSubpath are intentionally not included
              // They can't be safely transformed since they're not publicly exposed
            }

            // Only add to index if there are valid exports
            if (Object.keys(validExports).length > 0) {
              entry.exports = validExports;
              index[barrelPath] = entry;
            }
          } else {
            // No exports field - all exports are valid (legacy mode)
            index[barrelPath] = entry;
          }
        }
      } catch (err) {
        // Skip packages that can't be processed
        console.warn(
          `[barrel-transform] Error parsing package.json ${pkgJsonPath}: ${err.message}`
        );
      }
    })
  );

  // Step 3: Process internal barrels SECOND (skip if already indexed from node_modules)
  await Promise.all(
    kibanaBarrels.map(async (barrelPath) => {
      // Skip if already indexed from node_modules scan (e.g., @kbn/* package entry points)
      if (index[barrelPath]) return;

      try {
        const content = await readFile(barrelPath, 'utf-8');
        const exports = parseBarrelExports(content, barrelPath);

        if (Object.keys(exports).length > 0) {
          index[barrelPath] = { exports };
        }
      } catch (err) {
        console.warn(`[barrel-transform] Error parsing barrel file ${barrelPath}: ${err.message}`);
      }
    })
  );

  exportSourceCache.clear();

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

  // ESM: track imports to resolve re-exported defaults
  // e.g., import { ESQLEditor } from './src/esql_editor'; export default ESQLEditor;
  /** @type {Record<string, { path: string, importedName: string }>} */
  const importMap = {};

  traverse(ast, {
    // Track ESM imports for resolving export default of imported identifiers
    ImportDeclaration(nodePath) {
      const node = nodePath.node;
      const sourcePath = node.source.value;
      const resolvedPath = resolveModulePath(sourcePath, barrelDir);

      if (!resolvedPath) return;

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportSpecifier') {
          // import { Foo } or import { Foo as Bar }
          const localName = specifier.local.name;
          const imported = specifier.imported;
          const importedName = imported.type === 'Identifier' ? imported.name : imported.value;
          importMap[localName] = { path: resolvedPath, importedName };
        } else if (specifier.type === 'ImportDefaultSpecifier') {
          // import Foo from './source'
          importMap[specifier.local.name] = { path: resolvedPath, importedName: 'default' };
        }
        // Skip ImportNamespaceSpecifier (import * as X)
      }
    },

    // Handle: export { Foo, Bar as Baz } from './source'
    // Also handles: import { Foo } from './source'; export { Foo };
    ExportNamedDeclaration(nodePath) {
      const node = nodePath.node;

      if (node.source) {
        // Re-export with inline source: export { X } from './source'
        const sourcePath = node.source.value;
        const resolvedPath = resolveModulePath(sourcePath, barrelDir);

        if (!resolvedPath) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ExportSpecifier') {
            const exported = specifier.exported;
            const exportedName = exported.type === 'Identifier' ? exported.name : exported.value;
            const localName = specifier.local.name;

            // Recursively follow the export chain to find the actual source file
            const found = findExportSource(localName, resolvedPath, new Set());

            exports[exportedName] = {
              path: found ? found.path : resolvedPath,
              type: localName === 'default' ? 'default' : 'named',
              localName: found ? found.localName : localName,
              importedName: localName,
            };
          }
        }
      } else if (node.specifiers) {
        // Export from imported variable: import { X } from './source'; export { X };
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ExportSpecifier') {
            const exported = specifier.exported;
            const exportedName = exported.type === 'Identifier' ? exported.name : exported.value;
            const localName = specifier.local.name;

            // Check if this was imported from somewhere
            const importInfo = importMap[localName];
            if (importInfo) {
              // Only include if we can resolve the source (internal packages)
              const found = findExportSource(importInfo.importedName, importInfo.path, new Set());
              if (found) {
                exports[exportedName] = {
                  path: found.path,
                  type: found.isDefault ? 'default' : 'named',
                  localName: found.localName,
                  importedName: localName,
                };
              }
              // If not found (external package), skip - transformer will leave unchanged
            }
            // If not in importMap, it's a local definition - skip (can't transform)
          }
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

    // Handle: export default ...
    // Only captures re-exported imports (e.g., import X from './X'; export default X;)
    // Skips locally-defined defaults (can't transform - no other source to point to)
    ExportDefaultDeclaration(nodePath) {
      const node = nodePath.node;

      // Only handle identifiers that were imported from elsewhere
      if (node.declaration && node.declaration.type === 'Identifier') {
        const identifierName = node.declaration.name;
        const importInfo = importMap[identifierName];

        if (importInfo) {
          // Identifier was imported - trace to actual source
          const found = findExportSource(importInfo.importedName, importInfo.path, new Set());

          // Determine if source has default or named export
          // If found.isDefault is true, source has default export; otherwise it's named
          const isSourceDefault = found ? found.isDefault : importInfo.importedName === 'default';
          /** @type {'default' | 'named'} */
          const exportType = isSourceDefault ? 'default' : 'named';

          exports.default = {
            path: found ? found.path : importInfo.path,
            type: exportType,
            localName: found ? found.localName : importInfo.importedName,
            importedName: 'default',
          };
        }
        // If not in importMap, it's locally defined - skip (can't transform)
      }
      // Function/class declarations are locally defined - skip
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

      // Handle __exportStar(require("./path"), exports) pattern
      // Generated by TypeScript for: export * from './path'
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === '__exportStar' &&
        node.arguments.length >= 2 &&
        node.arguments[0].type === 'CallExpression' &&
        node.arguments[0].callee.type === 'Identifier' &&
        node.arguments[0].callee.name === 'require' &&
        node.arguments[0].arguments.length === 1 &&
        node.arguments[0].arguments[0].type === 'StringLiteral'
      ) {
        const requirePath = node.arguments[0].arguments[0].value;
        const resolvedPath = resolveModulePath(requirePath, barrelDir);

        if (resolvedPath) {
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
        }
      }

      // Handle Object.defineProperty pattern
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
 * Recursively find where an export is defined by following re-export chains.
 * Uses caching to avoid re-parsing the same file multiple times.
 *
 * @param {string} exportName - The export name to find
 * @param {string} filePath - File to search in
 * @param {Set<string>} [visited] - Visited files (prevent infinite loops)
 * @returns {{ path: string, localName: string, isDefault: boolean } | null}
 */
function findExportSource(exportName, filePath, visited = new Set()) {
  if (visited.has(filePath)) return null;

  // Check cache first
  if (exportSourceCache.has(filePath)) {
    const cached = exportSourceCache.get(filePath);
    return cached?.get(exportName) || null;
  }

  visited.add(filePath);

  // Parse file and cache ALL exports
  const fileExports = parseAllFileExports(filePath, visited);
  exportSourceCache.set(filePath, fileExports);

  return fileExports.get(exportName) || null;
}

/**
 * Parse a file and return a map of all export sources.
 * This parses the file ONCE and resolves all exports recursively.
 *
 * @param {string} filePath - File to parse
 * @param {Set<string>} visited - Visited files (prevent infinite loops)
 * @returns {Map<string, { path: string, localName: string, isDefault: boolean }>}
 */
function parseAllFileExports(filePath, visited) {
  /** @type {Map<string, { path: string, localName: string, isDefault: boolean }>} */
  const exports = new Map();

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return exports;
  }

  const ast = parser.parse(content, {
    sourceType: 'unambiguous',
    plugins: getParserPlugins(filePath),
    allowReturnOutsideFunction: true,
  });

  const barrelDir = path.dirname(filePath);

  // Track imports to resolve re-exported imports
  /** @type {Record<string, { path: string, importedName: string }>} */
  const importMap = {};

  traverse(ast, {
    // Track ESM imports for resolving export { X } where X was imported
    ImportDeclaration(nodePath) {
      const node = nodePath.node;
      const sourcePath = node.source.value;
      const resolvedPath = resolveModulePath(sourcePath, barrelDir);

      if (!resolvedPath) return;

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportSpecifier') {
          const localName = specifier.local.name;
          const imported = specifier.imported;
          const importedName = imported.type === 'Identifier' ? imported.name : imported.value;
          importMap[localName] = { path: resolvedPath, importedName };
        } else if (specifier.type === 'ImportDefaultSpecifier') {
          importMap[specifier.local.name] = { path: resolvedPath, importedName: 'default' };
        }
      }
    },

    ExportNamedDeclaration(nodePath) {
      const node = nodePath.node;

      // Re-export: export { X, Y, Z } from './source'
      if (node.source) {
        const resolved = resolveModulePath(node.source.value, barrelDir);
        if (!resolved) return;

        for (const spec of node.specifiers) {
          if (spec.type === 'ExportSpecifier') {
            const exported = spec.exported;
            const expName = exported.type === 'Identifier' ? exported.name : exported.value;
            const localName = spec.local.name;

            // Recursively follow the export chain
            const found = findExportSource(localName, resolved, new Set(visited));
            if (found) {
              exports.set(expName, found);
            } else {
              // Source file is the final destination - named export
              exports.set(expName, { path: resolved, localName, isDefault: false });
            }
          }
        }
      }

      // Direct export: export const X = ..., export function X() {}, etc.
      if (!node.source && node.declaration) {
        const decl = node.declaration;
        /** @type {string[]} */
        let names = [];

        if (decl.type === 'VariableDeclaration') {
          names = decl.declarations
            .filter((d) => d.id.type === 'Identifier')
            .map((d) => /** @type {import('@babel/types').Identifier} */ (d.id).name);
        } else if (
          (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') &&
          decl.id
        ) {
          names = [decl.id.name];
        } else if (
          (decl.type === 'TSTypeAliasDeclaration' || decl.type === 'TSInterfaceDeclaration') &&
          decl.id
        ) {
          names = [decl.id.name];
        }

        for (const name of names) {
          exports.set(name, { path: filePath, localName: name, isDefault: false });
        }
      }

      // Direct export from local: export { X, Y }
      // Could be: (1) locally defined, (2) imported then exported
      if (!node.source && node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ExportSpecifier') {
            const exported = spec.exported;
            const expName = exported.type === 'Identifier' ? exported.name : exported.value;
            const localName = spec.local.name;

            // Check if this was imported from somewhere
            const importInfo = importMap[localName];
            if (importInfo) {
              // Trace to the actual source file
              const found = findExportSource(importInfo.importedName, importInfo.path, new Set(visited));
              if (found) {
                exports.set(expName, found);
              }
              // If not found (external package), skip - will be handled by caller
            } else {
              // Locally defined - set path to current file
              exports.set(expName, { path: filePath, localName, isDefault: false });
            }
          }
        }
      }
    },

    // Handle: export * from './source'
    ExportAllDeclaration(nodePath) {
      const node = nodePath.node;
      const sourcePath = node.source.value;
      const resolved = resolveModulePath(sourcePath, barrelDir);

      if (!resolved) return;

      // Recursively get all exports from the source file
      const sourceExports = parseAllFileExports(resolved, new Set(visited));

      for (const [name, info] of sourceExports) {
        if (name !== 'default') {
          // export * doesn't re-export default
          exports.set(name, info);
        }
      }
    },

    ExportDefaultDeclaration(nodePath) {
      const node = nodePath.node;
      let localName = 'default';
      if (node.declaration) {
        if (node.declaration.type === 'Identifier') {
          localName = node.declaration.name;
        } else if ('id' in node.declaration && node.declaration.id) {
          localName = /** @type {{ name: string }} */ (node.declaration.id).name;
        }
      }
      exports.set('default', { path: filePath, localName, isDefault: true });
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

/**
 * Read and parse the exports field from a package's package.json.
 *
 * @param {string} packageRoot - Absolute path to the package root
 * @returns {Record<string, any> | null} - The exports field or null if not found
 */
function readPackageExports(packageRoot) {
  const pkgJsonPath = path.join(packageRoot, 'package.json');
  try {
    const content = fs.readFileSync(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(content);
    return pkgJson.exports || null;
  } catch {
    return null;
  }
}

/**
 * Extract the file target from a conditional exports value.
 * Handles both string values and conditional objects like { node: "./path", require: "./path" }
 *
 * @param {string | Record<string, any>} exportValue - The export value
 * @returns {string | null} - The file path target or null
 */
function extractFileTarget(exportValue) {
  if (typeof exportValue === 'string') {
    return exportValue;
  }

  if (typeof exportValue === 'object' && exportValue !== null) {
    // Prefer 'node' or 'require' conditions for CJS builds
    // Order of preference: node, require, default
    for (const condition of ['node', 'require', 'default']) {
      if (typeof exportValue[condition] === 'string') {
        return exportValue[condition];
      }
      // Handle nested conditions
      if (typeof exportValue[condition] === 'object') {
        const nested = extractFileTarget(exportValue[condition]);
        if (nested) return nested;
      }
    }
  }

  return null;
}

/**
 * Build a reverse mapping from file paths to public subpaths.
 *
 * @param {Record<string, any>} exportsField - The package.json exports field
 * @returns {ExportsReverseMapEntry[]} - Array of reverse mapping entries
 */
function buildExportsReverseMap(exportsField) {
  /** @type {ExportsReverseMapEntry[]} */
  const reverseMap = [];

  for (const [subpathPattern, exportValue] of Object.entries(exportsField)) {
    // Skip package.json export
    if (subpathPattern === './package.json') continue;

    const fileTarget = extractFileTarget(exportValue);
    if (!fileTarget) continue;

    const hasWildcard = subpathPattern.includes('*') && fileTarget.includes('*');

    if (hasWildcard) {
      // Convert file pattern to regex
      // e.g., "./dist/cjs/internal/*.js" -> /^dist\/cjs\/internal\/(.*)\.js$/
      const regexPattern = fileTarget
        .replace(/^\.\//, '') // Remove leading ./
        .replace(/\*/g, '___WILDCARD___') // Temporarily replace * to preserve it
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/___WILDCARD___/g, '(.*)'); // Replace placeholder with capture group

      reverseMap.push({
        subpathPattern,
        fileRegex: new RegExp(`^${regexPattern}$`),
        hasWildcard: true,
      });
    } else {
      // Exact match - convert file target to regex
      const regexPattern = fileTarget.replace(/^\.\//, '').replace(/[.+?^${}()|[\]\\]/g, '\\$&');

      reverseMap.push({
        subpathPattern,
        fileRegex: new RegExp(`^${regexPattern}$`),
        hasWildcard: false,
      });
    }
  }

  return reverseMap;
}

/**
 * Resolve a file path to its public subpath using the exports reverse map.
 *
 * @param {string} filePath - Relative file path from package root (e.g., "dist/cjs/internal/Observable.js")
 * @param {ExportsReverseMapEntry[]} reverseMap - The reverse mapping entries
 * @returns {string | null} - The public subpath (without leading ./ or package name) or null
 */
function resolvePublicSubpath(filePath, reverseMap) {
  // Normalize the file path - remove leading ./ if present
  const normalizedPath = filePath.replace(/^\.\//, '');

  for (const entry of reverseMap) {
    const match = normalizedPath.match(entry.fileRegex);
    if (match) {
      if (entry.hasWildcard) {
        // Substitute the captured wildcard value into the subpath pattern
        const wildcardValue = match[1];
        // Remove leading ./ and the extension from the subpath
        let subpath = entry.subpathPattern.replace(/^\.\//, '').replace('*', wildcardValue);
        // Remove trailing file extension if present in the result
        subpath = subpath.replace(/\.(js|ts|tsx|jsx)$/, '');
        return subpath;
      } else {
        // Exact match - return the subpath without ./
        const subpath = entry.subpathPattern.replace(/^\.\//, '');
        // Handle '.' (root) export
        if (subpath === '.') {
          return '';
        }
        return subpath;
      }
    }
  }

  return null;
}

module.exports = {
  buildBarrelIndex,
  readPackageExports,
  buildExportsReverseMap,
  resolvePublicSubpath,
};
