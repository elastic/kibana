/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const { createImportDeclaration } = require('./ast_utils');

/**
 * @typedef {import('./ast_utils').ImportSpecifierInfo} ImportSpecifierInfo
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
  const importSource = node.source.value;
  const currentFileDir = path.dirname(state.filename);

  // Resolve the import source to absolute path and get barrel entry
  const barrelEntry = resolveToBarrelEntry(importSource, currentFileDir, barrelIndex);
  if (!barrelEntry) {
    return;
  }

  const { exports, packageName, packageRoot } = barrelEntry;

  // Collect new imports grouped by target path
  /** @type {Map<string, ImportSpecifierInfo[]>} */
  const newImports = new Map();

  /** @type {Array<import('@babel/types').ImportSpecifier | import('@babel/types').ImportDefaultSpecifier | import('@babel/types').ImportNamespaceSpecifier>} */
  const unchangedSpecifiers = [];

  for (const specifier of node.specifiers) {
    if (specifier.type === 'ImportSpecifier') {
      const imported = specifier.imported;
      const importedName = imported.type === 'Identifier' ? imported.name : imported.value;
      const localName = specifier.local.name;
      const exportInfo = exports[importedName];

      if (exportInfo) {
        if (!newImports.has(exportInfo.path)) {
          newImports.set(exportInfo.path, []);
        }
        newImports.get(exportInfo.path)?.push({
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
          newImports.set(exportInfo.path, []);
        }
        newImports.get(exportInfo.path)?.push({
          localName,
          importedName: 'default',
          isDefault: true,
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

  for (const [targetPath, specifiers] of newImports) {
    // Convert absolute path to importable path
    const outputPath = toImportPath(targetPath, currentFileDir, packageName, packageRoot);
    newNodes.push(createImportDeclaration(t, specifiers, outputPath));
  }

  if (unchangedSpecifiers.length > 0) {
    newNodes.push(t.importDeclaration(unchangedSpecifiers, t.stringLiteral(importSource)));
  }

  if (newNodes.length === 1) {
    nodePath.replaceWith(newNodes[0]);
  } else {
    nodePath.replaceWithMultiple(newNodes);
  }
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
  // For relative imports, resolve manually
  if (importSource.startsWith('.') || importSource.startsWith('/')) {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
    const basePath = path.resolve(fromDir, importSource);

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

  // For package imports, use require.resolve
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
 * @returns {string} - Importable path
 */
function toImportPath(absolutePath, fromDir, packageName, packageRoot) {
  // For package imports: convert to package subpath
  if (packageName && packageRoot) {
    let subPath = path.relative(packageRoot, absolutePath);
    subPath = subPath.replace(/\.(ts|tsx|js|jsx)$/, '');
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

module.exports = { transformImportDeclaration };
