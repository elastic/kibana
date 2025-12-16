'use strict';

const path = require('path');
const { createImportDeclaration } = require('./ast_utils');

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
 * @param {import('@babel/types')} t
 * @param {import('./types').BarrelIndex} barrelIndex
 */
function transformImportDeclaration(nodePath, state, t, barrelIndex) {
  const node = nodePath.node;
  const importSource = node.source.value;

  // Skip non-relative imports (node_modules, aliases handled elsewhere)
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
    return;
  }

  // Resolve the import source to absolute path
  const currentFileDir = path.dirname(state.filename);
  const resolvedSource = resolveToBarrelPath(importSource, currentFileDir, barrelIndex);

  if (!resolvedSource) {
    // Not a barrel file, leave import unchanged
    return;
  }

  const barrelEntry = barrelIndex[resolvedSource];
  if (!barrelEntry) {
    return;
  }

  const { exports } = barrelEntry;

  // Collect new imports grouped by target path
  /** @type {Map<string, Array<{localName: string, importedName: string, isDefault: boolean}>>} */
  const newImports = new Map();

  /** @type {Array<import('@babel/types').ImportSpecifier | import('@babel/types').ImportDefaultSpecifier | import('@babel/types').ImportNamespaceSpecifier>} */
  const unchangedSpecifiers = [];

  for (const specifier of node.specifiers) {
    if (specifier.type === 'ImportSpecifier') {
      // import { Foo } from './barrel' or import { Foo as Bar } from './barrel'
      const importedName = specifier.imported.name || specifier.imported.value;
      const localName = specifier.local.name;

      const exportInfo = exports[importedName];

      if (exportInfo) {
        const targetPath = exportInfo.path;

        if (!newImports.has(targetPath)) {
          newImports.set(targetPath, []);
        }

        newImports.get(targetPath).push({
          localName: localName,
          importedName: exportInfo.localName,
          isDefault: exportInfo.type === 'default',
        });
      } else {
        // Export not found in barrel, keep original specifier
        unchangedSpecifiers.push(specifier);
      }
    } else if (specifier.type === 'ImportDefaultSpecifier') {
      // import Foo from './barrel'
      const localName = specifier.local.name;
      const exportInfo = exports['default'];

      if (exportInfo) {
        const targetPath = exportInfo.path;

        if (!newImports.has(targetPath)) {
          newImports.set(targetPath, []);
        }

        newImports.get(targetPath).push({
          localName: localName,
          importedName: 'default',
          isDefault: true,
        });
      } else {
        unchangedSpecifiers.push(specifier);
      }
    } else if (specifier.type === 'ImportNamespaceSpecifier') {
      // import * as Foo from './barrel'
      // Cannot transform namespace imports, keep as-is
      unchangedSpecifiers.push(specifier);
    }
  }

  // If nothing to transform, leave unchanged
  if (newImports.size === 0) {
    return;
  }

  // Build new import declarations
  const newNodes = [];

  for (const [targetPath, specifiers] of newImports) {
    // Convert absolute path to relative from current file
    const relativePath = absoluteToRelative(targetPath, currentFileDir);

    const importNode = createImportDeclaration(t, specifiers, relativePath);
    newNodes.push(importNode);
  }

  // If there are unchanged specifiers, keep a modified original import
  if (unchangedSpecifiers.length > 0) {
    const remainingImport = t.importDeclaration(
      unchangedSpecifiers,
      t.stringLiteral(importSource)
    );
    newNodes.push(remainingImport);
  }

  // Replace the original import with new imports
  if (newNodes.length === 1) {
    nodePath.replaceWith(newNodes[0]);
  } else {
    nodePath.replaceWithMultiple(newNodes);
  }
}

/**
 * Resolve an import source to a barrel file path.
 *
 * @param {string} importSource - The import path
 * @param {string} fromDir - Directory of the importing file
 * @param {import('./types').BarrelIndex} barrelIndex
 * @returns {string | null} - Absolute barrel path or null
 */
function resolveToBarrelPath(importSource, fromDir, barrelIndex) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];

  const basePath = path.resolve(fromDir, importSource);

  // Try as-is with extensions
  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (barrelIndex[fullPath]) {
      return fullPath;
    }
  }

  // Try as directory with index file
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const indexPath = path.join(basePath, 'index' + ext);
    if (barrelIndex[indexPath]) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Convert an absolute path to a relative path from a directory.
 *
 * @param {string} absolutePath - Absolute target path
 * @param {string} fromDir - Directory to make relative from
 * @returns {string} - Relative path (always starts with ./ or ../)
 */
function absoluteToRelative(absolutePath, fromDir) {
  let relativePath = path.relative(fromDir, absolutePath);

  // Remove extension for cleaner imports
  relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');

  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  return relativePath;
}

module.exports = { transformImportDeclaration };

