/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { dirname, resolve as resolvePath } from 'path';
import type { Logger } from '@kbn/core/server';

interface ImportInfo {
  source: string;
  isDefault: boolean;
  isNamespace: boolean;
}

/** Reads an import declaration from `filePath` that exports `componentName`. */
const findImport = (filePath: string, componentName: string): ImportInfo | null => {
  let source: string;
  try {
    source = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  // Dynamically import @babel/parser (same pattern as get_component_data.ts)
  // Using synchronous require here since this runs server-side in Node.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { parse } = require('@babel/parser') as typeof import('@babel/parser');

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch {
    return null;
  }

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const importSource = node.source.value;
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier' && specifier.local.name === componentName) {
        return { source: importSource, isDefault: true, isNamespace: false };
      }
      if (specifier.type === 'ImportSpecifier' && specifier.local.name === componentName) {
        return { source: importSource, isDefault: false, isNamespace: false };
      }
      if (specifier.type === 'ImportNamespaceSpecifier' && specifier.local.name === componentName) {
        return { source: importSource, isDefault: false, isNamespace: true };
      }
    }
  }
  return null;
};

/**
 * Checks whether a file re-exports `componentName` and returns the source path
 * of the re-export, or null if the symbol is defined here.
 */
const findReExport = (filePath: string, componentName: string): string | null => {
  let source: string;
  try {
    source = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { parse } = require('@babel/parser') as typeof import('@babel/parser');

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch {
    return null;
  }

  for (const node of ast.program.body) {
    if (node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportAllDeclaration') continue;
    const exportSource = (node as { source?: { value: string } }).source?.value;
    if (!exportSource) continue;

    if (node.type === 'ExportAllDeclaration') {
      return exportSource; // `export * from '...'` — assume symbol lives there
    }
    // ExportNamedDeclaration with source: `export { X } from '...'`
    const specifiers =
      (node as { specifiers?: Array<{ exported?: { name: string }; local?: { name: string } }> })
        .specifiers ?? [];
    for (const spec of specifiers) {
      if (spec.exported?.name === componentName || spec.local?.name === componentName) {
        return exportSource;
      }
    }
  }
  return null;
};

/**
 * Resolves a module specifier to an absolute file path using Node's built-in
 * resolution (handles node_modules, relative paths, and tsconfig path aliases
 * that are resolvable at runtime).
 */
const resolveModulePath = (specifier: string, containingFile: string): string | null => {
  const dir = dirname(containingFile);
  try {
    if (specifier.startsWith('.')) {
      // Relative import — try common extensions.
      for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx']) {
        try {
          return require.resolve(resolvePath(dir, specifier + ext));
        } catch {
          /* continue */
        }
      }
    } else {
      return require.resolve(specifier, { paths: [dir] });
    }
  } catch {
    /* fall through */
  }
  return null;
};

/**
 * Given a use-site file and a component display name, resolves the absolute
 * path of the file where the component is defined.
 *
 * Follows re-exports up to `maxDepth` hops to handle barrel files.
 * Returns null if resolution fails at any step.
 */
export const resolveComponentSource = (
  fromFile: string,
  componentName: string,
  logger: Logger,
  maxDepth = 5
): string | null => {
  let currentFile = fromFile;
  let depth = 0;

  while (depth < maxDepth) {
    const importInfo = findImport(currentFile, componentName);
    if (!importInfo) return null;

    const resolvedPath = resolveModulePath(importInfo.source, currentFile);
    if (!resolvedPath) {
      logger.debug(
        `[docgen] RESOLVE_FAILED: cannot resolve '${importInfo.source}' from ${currentFile}`
      );
      return null;
    }

    // Check if the resolved file re-exports the symbol.
    const reExportSource = findReExport(resolvedPath, componentName);
    if (!reExportSource) {
      // The symbol is defined (or the file doesn't re-export it), treat as definition.
      return resolvedPath;
    }

    // Follow the re-export.
    const nextPath = resolveModulePath(reExportSource, resolvedPath);
    if (!nextPath) {
      logger.debug(
        `[docgen] RESOLVE_FAILED: cannot follow re-export '${reExportSource}' from ${resolvedPath}`
      );
      return null;
    }

    currentFile = nextPath;
    depth++;
  }

  logger.debug(`[docgen] RESOLVE_FAILED: exceeded max depth for ${componentName} from ${fromFile}`);
  return null;
};
