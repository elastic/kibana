/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const fs = require('fs');
const {
  createImportDeclaration,
  createExportNamedDeclaration,
  isTypeOnlyImport,
  isTypeOnlyExport,
} = require('./ast_utils');

/**
 * @typedef {import('./ast_utils').ImportSpecifierInfo} ImportSpecifierInfo
 */

/**
 * @typedef {import('./ast_utils').ExportSpecifierInfo} ExportSpecifierInfo
 */

/**
 * Transform a barrel import to direct imports.
 *
 * Example:
 *   import { Button, Modal } from './components';
 * Becomes:
 *   import { Button } from './components/Button/Button';
 *   import { Modal } from './components/Modal/Modal';
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ImportDeclaration>} nodePath
 * @param {import('@babel/core').PluginPass} state
 * @param {typeof import('@babel/types')} t
 * @param {import('./types').BarrelIndex} barrelIndex
 */
function transformImportDeclaration(nodePath, state, t, barrelIndex) {
  const node = nodePath.node;

  // Skip declarations that are explicitly `import type ...`
  if (node.importKind === 'type') {
    return;
  }

  const importSource = node.source.value;
  const currentFileDir = path.dirname(state.filename);

  /**
   * Check if a specifier is type-only (either via specifier.importKind or isTypeOnlyImport).
   * @param {import('@babel/types').ImportSpecifier | import('@babel/types').ImportDefaultSpecifier | import('@babel/types').ImportNamespaceSpecifier} specifier
   * @returns {boolean}
   */
  const isTypeSpecifier = (specifier) =>
    ('importKind' in specifier && specifier.importKind === 'type') ||
    (specifier.type === 'ImportSpecifier' && isTypeOnlyImport(specifier));

  // Resolve the import source to absolute path and get barrel entry
  const barrelEntry = resolveToBarrelEntry(importSource, currentFileDir, barrelIndex);
  if (!barrelEntry) {
    return;
  }

  const { exports, packageName, packageRoot } = barrelEntry;

  // Collect new imports grouped by target path
  // Key is path, value includes specifiers and optional publicSubpath
  /** @type {Map<string, { specifiers: ImportSpecifierInfo[], publicSubpath?: string }>} */
  const newImports = new Map();

  /** @type {Array<import('@babel/types').ImportSpecifier | import('@babel/types').ImportDefaultSpecifier | import('@babel/types').ImportNamespaceSpecifier>} */
  const unchangedSpecifiers = [];

  for (const specifier of node.specifiers) {
    // Keep type-only specifiers unchanged - they should not be transformed
    if (isTypeSpecifier(specifier)) {
      unchangedSpecifiers.push(specifier);
      continue;
    }

    if (specifier.type === 'ImportSpecifier') {
      const imported = specifier.imported;
      const importedName = imported.type === 'Identifier' ? imported.name : imported.value;
      const localName = specifier.local.name;
      const exportInfo = exports[importedName];

      if (exportInfo) {
        if (!newImports.has(exportInfo.path)) {
          newImports.set(exportInfo.path, {
            specifiers: [],
            publicSubpath: exportInfo.publicSubpath,
          });
        }
        newImports.get(exportInfo.path)?.specifiers.push({
          localName,
          importedName: exportInfo.localName,
          isDefault: exportInfo.type === 'default',
        });
      } else {
        unchangedSpecifiers.push(specifier);
      }
    } else if (specifier.type === 'ImportDefaultSpecifier') {
      const localName = specifier.local.name;
      const exportInfo = exports.default;

      if (exportInfo) {
        if (!newImports.has(exportInfo.path)) {
          newImports.set(exportInfo.path, {
            specifiers: [],
            publicSubpath: exportInfo.publicSubpath,
          });
        }
        // Use the traced export type to determine whether to generate default or named import
        const isSourceDefault = exportInfo.type === 'default';
        newImports.get(exportInfo.path)?.specifiers.push({
          localName,
          importedName: isSourceDefault ? 'default' : exportInfo.localName,
          isDefault: isSourceDefault,
        });
      } else {
        unchangedSpecifiers.push(specifier);
      }
    } else if (specifier.type === 'ImportNamespaceSpecifier') {
      // Cannot transform namespace imports
      unchangedSpecifiers.push(specifier);
    }
  }

  if (newImports.size === 0) {
    return;
  }

  /** @type {import('@babel/types').ImportDeclaration[]} */
  const newNodes = [];

  for (const [targetPath, { specifiers, publicSubpath }] of newImports) {
    // Convert absolute path to importable path
    const outputPath = toImportPath(
      targetPath,
      currentFileDir,
      packageName,
      packageRoot,
      publicSubpath
    );
    newNodes.push(createImportDeclaration(t, specifiers, outputPath));
  }

  if (unchangedSpecifiers.length > 0) {
    // Insert fallback barrel import FIRST to ensure the barrel is fully loaded
    // before any submodules that may depend on it (circular dependency safety)
    const fallback = t.importDeclaration(unchangedSpecifiers, t.stringLiteral(importSource));
    fallback.importKind = node.importKind;
    newNodes.unshift(fallback);
  }

  if (newNodes.length === 1) {
    nodePath.replaceWith(newNodes[0]);
  } else {
    nodePath.replaceWithMultiple(newNodes);
  }
}

/**
 * Try to find a barrel entry by checking multiple extensions.
 *
 * @param {string} basePath - Base path to try
 * @param {import('./types').BarrelIndex} barrelIndex
 * @returns {import('./types').BarrelFileEntry | null}
 */
function tryResolveBarrel(basePath, barrelIndex) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
  for (const ext of extensions) {
    if (barrelIndex[basePath + ext]) {
      return barrelIndex[basePath + ext];
    }
    const indexPath = path.join(basePath, 'index' + ext);
    if (barrelIndex[indexPath]) {
      return barrelIndex[indexPath];
    }
  }
  return null;
}

/**
 * Resolve an import source to its barrel entry.
 *
 * @param {string} importSource - The import path
 * @param {string} fromDir - Directory of the importing file
 * @param {import('./types').BarrelIndex} barrelIndex
 * @returns {import('./types').BarrelFileEntry | null}
 */
function resolveToBarrelEntry(importSource, fromDir, barrelIndex) {
  // For relative imports
  if (importSource.startsWith('.') || importSource.startsWith('/')) {
    return tryResolveBarrel(path.resolve(fromDir, importSource), barrelIndex);
  }

  // For @kbn/* packages, walk up to find node_modules
  if (importSource.startsWith('@kbn/')) {
    let currentDir = fromDir;
    while (currentDir !== path.dirname(currentDir)) {
      const pkgDir = path.join(currentDir, 'node_modules', importSource);
      try {
        if (fs.existsSync(pkgDir)) {
          const entry = tryResolveBarrel(fs.realpathSync(pkgDir), barrelIndex);
          // Only use barrels with packageName for @kbn/* imports
          if (entry && entry.packageName) {
            return entry;
          }
        }
      } catch {
        // Continue searching up
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  // For other package imports, use require.resolve
  try {
    const resolved = require.resolve(importSource, { paths: [fromDir] });
    if (barrelIndex[resolved]) {
      return barrelIndex[resolved];
    }
  } catch {
    // Package not found or not resolvable
  }

  return null;
}

/**
 * Convert an absolute file path to an importable path.
 *
 * @param {string} absolutePath - Absolute path to the target file
 * @param {string} fromDir - Directory of the importing file
 * @param {string} [packageName] - Package name if this is a node_modules import
 * @param {string} [packageRoot] - Package root path if this is a node_modules import
 * @param {string} [publicSubpath] - Pre-computed public subpath from package exports field
 * @returns {string} - Importable path
 */
function toImportPath(absolutePath, fromDir, packageName, packageRoot, publicSubpath) {
  // For package imports with public subpath from exports field
  if (packageName && publicSubpath !== undefined) {
    // publicSubpath is already the correct subpath (e.g., "internal/Observable")
    // Return empty string check for root exports
    if (publicSubpath === '') {
      return packageName;
    }
    return `${packageName}/${publicSubpath}`;
  }

  // For package imports without exports field: compute from file path
  if (packageName && packageRoot) {
    let subPath = path.relative(packageRoot, absolutePath);
    subPath = subPath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
    subPath = subPath.replace(/\/index$/, '');
    return `${packageName}/${subPath}`;
  }

  // For relative imports: convert to relative path
  let relativePath = path.relative(fromDir, absolutePath);
  relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  return relativePath;
}

/**
 * Transform a barrel re-export to direct re-exports.
 *
 * Example:
 *   export { Button, Modal } from './components';
 * Becomes:
 *   export { Button } from './components/Button/Button';
 *   export { Modal } from './components/Modal/Modal';
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ExportNamedDeclaration>} nodePath
 * @param {import('@babel/core').PluginPass} state
 * @param {typeof import('@babel/types')} t
 * @param {import('./types').BarrelIndex} barrelIndex
 */
function transformExportNamedDeclaration(nodePath, state, t, barrelIndex) {
  const node = nodePath.node;

  // Skip type-only exports: export type { X } from 'pkg'
  if (node.exportKind === 'type') {
    return;
  }

  // Must have a source (this is a re-export)
  if (!node.source) {
    return;
  }

  const exportSource = node.source.value;
  const currentFileDir = path.dirname(state.filename);

  // Resolve the export source to barrel entry
  const barrelEntry = resolveToBarrelEntry(exportSource, currentFileDir, barrelIndex);
  if (!barrelEntry) {
    return;
  }

  const { exports, packageName, packageRoot } = barrelEntry;

  // Collect new exports grouped by target path
  /** @type {Map<string, { specifiers: ExportSpecifierInfo[], publicSubpath?: string }>} */
  const newExports = new Map();

  /** @type {Array<import('@babel/types').ExportSpecifier | import('@babel/types').ExportNamespaceSpecifier>} */
  const unchangedSpecifiers = [];

  for (const specifier of node.specifiers) {
    // Keep type-only specifiers unchanged
    if (specifier.type === 'ExportSpecifier' && isTypeOnlyExport(specifier)) {
      unchangedSpecifiers.push(specifier);
      continue;
    }

    if (specifier.type === 'ExportSpecifier') {
      // In ExportSpecifier, local is always an Identifier
      const localName = specifier.local.name;
      const exported = specifier.exported;
      // exported can be Identifier or StringLiteral
      const exportedName = exported.type === 'Identifier' ? exported.name : exported.value;
      const exportInfo = exports[localName];

      if (exportInfo) {
        if (!newExports.has(exportInfo.path)) {
          newExports.set(exportInfo.path, {
            specifiers: [],
            publicSubpath: exportInfo.publicSubpath,
          });
        }
        newExports.get(exportInfo.path)?.specifiers.push({
          localName: exportInfo.localName,
          exportedName,
        });
      } else {
        unchangedSpecifiers.push(specifier);
      }
    } else if (specifier.type === 'ExportNamespaceSpecifier') {
      // Cannot transform namespace exports: export * as X from 'pkg'
      unchangedSpecifiers.push(specifier);
    }
  }

  if (newExports.size === 0) {
    return;
  }

  /** @type {import('@babel/types').ExportNamedDeclaration[]} */
  const newNodes = [];

  for (const [targetPath, { specifiers, publicSubpath }] of newExports) {
    const outputPath = toImportPath(
      targetPath,
      currentFileDir,
      packageName,
      packageRoot,
      publicSubpath
    );
    newNodes.push(createExportNamedDeclaration(t, specifiers, outputPath));
  }

  if (unchangedSpecifiers.length > 0) {
    // Keep fallback export for unchanged specifiers FIRST (circular dependency safety)
    const fallback = t.exportNamedDeclaration(
      null,
      unchangedSpecifiers,
      t.stringLiteral(exportSource)
    );
    fallback.exportKind = node.exportKind;
    newNodes.unshift(fallback);
  }

  if (newNodes.length === 1) {
    nodePath.replaceWith(newNodes[0]);
  } else {
    nodePath.replaceWithMultiple(newNodes);
  }
}

/**
 * Collect all locally-defined export names from the program body.
 * These names shadow any re-exports from `export * from` declarations.
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ExportAllDeclaration>} nodePath
 * @returns {Set<string>} Set of locally exported names
 */
function collectLocalExportNames(nodePath) {
  /** @type {Set<string>} */
  const localExports = new Set();

  // Get the program body (sibling nodes)
  const programPath = nodePath.findParent((p) => p.isProgram());
  if (!programPath) {
    return localExports;
  }

  const programNode = /** @type {import('@babel/types').Program} */ (programPath.node);
  if (!programNode.body) {
    return localExports;
  }

  for (const stmt of programNode.body) {
    if (stmt.type === 'ExportNamedDeclaration') {
      // Case 1: export const/let/var/function/class/enum NAME
      if (stmt.declaration) {
        const decl = stmt.declaration;
        if (decl.type === 'VariableDeclaration') {
          for (const declarator of decl.declarations) {
            if (declarator.id.type === 'Identifier') {
              localExports.add(declarator.id.name);
            }
          }
        } else if (
          (decl.type === 'FunctionDeclaration' ||
            decl.type === 'ClassDeclaration' ||
            decl.type === 'TSEnumDeclaration') &&
          decl.id
        ) {
          localExports.add(decl.id.name);
        } else if (
          (decl.type === 'TSTypeAliasDeclaration' || decl.type === 'TSInterfaceDeclaration') &&
          decl.id
        ) {
          localExports.add(decl.id.name);
        }
      }

      // Case 2: export { NAME } (without source - local re-export)
      if (!stmt.source && stmt.specifiers) {
        for (const specifier of stmt.specifiers) {
          if (specifier.type === 'ExportSpecifier') {
            const exported = specifier.exported;
            const exportedName = exported.type === 'Identifier' ? exported.name : exported.value;
            localExports.add(exportedName);
          }
        }
      }
    } else if (stmt.type === 'ExportDefaultDeclaration') {
      // export default shadows 'default' from export *
      localExports.add('default');
    }
  }

  return localExports;
}

/**
 * Transform a barrel star re-export to direct re-exports.
 *
 * Example:
 *   export * from './components';
 * Becomes:
 *   export { Button } from './components/Button/Button';
 *   export { Modal } from './components/Modal/Modal';
 *
 * Note: This expands the star export into individual named exports.
 * Local exports in the same file shadow re-exports from export *.
 *
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ExportAllDeclaration>} nodePath
 * @param {import('@babel/core').PluginPass} state
 * @param {typeof import('@babel/types')} t
 * @param {import('./types').BarrelIndex} barrelIndex
 */
function transformExportAllDeclaration(nodePath, state, t, barrelIndex) {
  const node = nodePath.node;
  const exportSource = node.source.value;
  const currentFileDir = path.dirname(state.filename);

  // Resolve the export source to barrel entry
  const barrelEntry = resolveToBarrelEntry(exportSource, currentFileDir, barrelIndex);
  if (!barrelEntry) {
    return;
  }

  const { exports, packageName, packageRoot } = barrelEntry;

  // Collect locally-defined exports that shadow re-exports
  const localExports = collectLocalExportNames(nodePath);

  // Group all exports by their target path
  /** @type {Map<string, { specifiers: ExportSpecifierInfo[], publicSubpath?: string }>} */
  const newExports = new Map();

  for (const [exportName, exportInfo] of Object.entries(exports)) {
    // Skip default export (export * doesn't re-export default)
    if (exportName === 'default') {
      continue;
    }

    // Skip exports that are shadowed by local definitions
    if (localExports.has(exportName)) {
      continue;
    }

    if (!newExports.has(exportInfo.path)) {
      newExports.set(exportInfo.path, {
        specifiers: [],
        publicSubpath: exportInfo.publicSubpath,
      });
    }
    newExports.get(exportInfo.path)?.specifiers.push({
      localName: exportInfo.localName,
      exportedName: exportName,
    });
  }

  if (newExports.size === 0) {
    // All exports are shadowed by local definitions - remove the export * entirely
    nodePath.remove();
    return;
  }

  /** @type {import('@babel/types').ExportNamedDeclaration[]} */
  const newNodes = [];

  for (const [targetPath, { specifiers, publicSubpath }] of newExports) {
    const outputPath = toImportPath(
      targetPath,
      currentFileDir,
      packageName,
      packageRoot,
      publicSubpath
    );
    newNodes.push(createExportNamedDeclaration(t, specifiers, outputPath));
  }

  if (newNodes.length === 1) {
    nodePath.replaceWith(newNodes[0]);
  } else {
    nodePath.replaceWithMultiple(newNodes);
  }
}

module.exports = {
  transformImportDeclaration,
  transformExportNamedDeclaration,
  transformExportAllDeclaration,
};
