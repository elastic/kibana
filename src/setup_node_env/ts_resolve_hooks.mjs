/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Node.js ESM hooks for TypeScript support.
 *
 * Resolve hook: resolves extensionless imports to .ts/.tsx files.
 * Load hook: transforms .tsx files via esbuild (Node can't handle JSX natively).
 *
 * Strategy: try default resolution first, fall back to .ts extensions on failure.
 * This is registered via module.register() in setup_node_env/index.js.
 */

import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';

// Extensions to try as fallbacks, in priority order
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '/index.js'];

// File extensions to try when bypassing exports maps
const FILE_EXTENSIONS = ['', '.js', '.ts', '.d.ts', '.json'];

/**
 * Try to resolve a file path directly, bypassing package.json exports maps.
 * This is needed because ESM strictly enforces exports maps, but many packages
 * (like @elastic/elasticsearch) have deep imports used as type-only imports that
 * need to resolve even though they're erased at compile time.
 */
function tryDirectFileResolve(specifier) {
  // Parse package name and subpath
  const parts = specifier.split('/');
  let pkgName;
  if (specifier.startsWith('@')) {
    pkgName = parts.slice(0, 2).join('/');
  } else {
    pkgName = parts[0];
  }
  const subpath = parts.slice(pkgName.split('/').length).join('/');
  if (!subpath) return null;

  // Try to find the file in node_modules
  const pkgDir = pathResolve(process.cwd(), 'node_modules', pkgName);
  for (const ext of FILE_EXTENSIONS) {
    const filePath = pathResolve(pkgDir, subpath + ext);
    try {
      if (statSync(filePath).isFile()) {
        return { url: pathToFileURL(filePath).href, shortCircuit: true };
      }
    } catch {
      // file doesn't exist, try next extension
    }
  }
  return null;
}

/**
 * Try to resolve a directory import by reading its package.json `main` field.
 * ESM doesn't support directory imports, but CJS does (via package.json main).
 * Returns a resolved URL or null.
 */
function tryDirectoryResolve(specifier, dirPath) {
  // Check if the directory has a package.json with a main field
  const pkgJsonPath = pathResolve(dirPath, 'package.json');
  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    if (pkgJson.main) {
      const mainPath = pathResolve(dirPath, pkgJson.main);
      try {
        if (statSync(mainPath).isFile()) {
          return { url: pathToFileURL(mainPath).href, shortCircuit: true };
        }
      } catch {
        // main doesn't point to a file
      }
    }
  } catch {
    // no package.json in directory
  }

  // Fallback: try index.js / index.ts
  for (const indexFile of ['index.js', 'index.ts']) {
    const indexPath = pathResolve(dirPath, indexFile);
    try {
      if (statSync(indexPath).isFile()) {
        return { url: pathToFileURL(indexPath).href, shortCircuit: true };
      }
    } catch {
      // continue
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Try default resolution first
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // If a package exports map blocks a deep import, try resolving the file directly.
    // This is needed for type-only imports that are erased at compile time but must
    // still resolve in ESM (resolution happens before compilation).
    if (err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      const result = tryDirectFileResolve(specifier);
      if (result) return result;
    }

    // Handle directory imports (ESM doesn't support them, but CJS does).
    // Packages like fp-ts use directory imports with package.json main fields.
    if (err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      // Extract the directory path from the error
      const match = err.message.match(/Directory import '([^']+)'/);
      if (match) {
        const result = tryDirectoryResolve(specifier, match[1]);
        if (result) return result;
      }
    }

    // If the specifier already has a file extension, don't try alternatives
    if (/\.\w+$/.test(specifier)) {
      throw err;
    }

    // Try appending extensions (.ts, .tsx, /index.ts, etc.)
    for (const ext of EXTENSIONS) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // continue to next extension
      }
    }

    // None of the alternatives worked, throw original error
    throw err;
  }
}

/**
 * Load hook: transforms .tsx files via esbuild since Node's
 * --experimental-transform-types doesn't support JSX syntax.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith('.tsx')) {
    // Lazy-import esbuild to avoid loading it unless needed
    const { transformSync } = await import('esbuild');
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, 'utf-8');
    const { code } = transformSync(source, {
      loader: 'tsx',
      format: 'esm',
      target: 'node22',
      sourcefile: filePath,
      sourcemap: 'inline',
    });
    return { format: 'module', source: code, shortCircuit: true };
  }

  return nextLoad(url, context);
}
