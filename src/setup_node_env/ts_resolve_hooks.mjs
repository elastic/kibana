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

import { readFileSync, statSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as pathResolve, dirname } from 'node:path';

// Cache for package type lookups (true = CJS, false = ESM)
const cjsPackageCache = new Map();

/**
 * Check whether a bare specifier refers to a CJS package (no "type": "module").
 */
function isCjsPackage(specifier) {
  const parts = specifier.split('/');
  const pkgName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];

  if (cjsPackageCache.has(pkgName)) return cjsPackageCache.get(pkgName);

  let isCjs = true; // assume CJS when we can't determine
  try {
    const pkgJsonPath = pathResolve(process.cwd(), 'node_modules', pkgName, 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    isCjs = pkgJson.type !== 'module';
  } catch {
    /* can't read package.json — assume CJS */
  }

  cjsPackageCache.set(pkgName, isCjs);
  return isCjs;
}

/**
 * Rewrite named imports from CJS packages so they work in Node's ESM loader.
 *
 * Node can't resolve named exports from most CJS packages (e.g. lodash) via
 * `import { pick } from 'lodash'`. The default export always works though.
 * This rewrites:
 *   import { pick, omit as o } from 'lodash';
 * to:
 *   import __cjs$0 from 'lodash'; const { pick, omit: o } = __cjs$0;
 */
function fixCjsNamedImports(code) {
  let counter = 0;
  return code.replace(
    /^\s*import\s*\{([^}]+)\}\s*from\s*(["'])([^"']+)\2\s*;?/gm,
    (match, names, quote, specifier) => {
      // Skip relative imports, node builtins, and @kbn/* packages (ESM source)
      if (
        specifier.startsWith('.') ||
        specifier.startsWith('/') ||
        specifier.startsWith('node:') ||
        specifier.startsWith('@kbn/')
      ) {
        return match;
      }
      if (!isCjsPackage(specifier)) return match;

      const alias = `__cjs$${counter++}`;
      // Convert ESM `as` aliases to destructuring `:` syntax
      const destructured = names.replace(/\bas\b/g, ':');
      return `import ${alias} from ${quote}${specifier}${quote}; const {${destructured}} = ${alias};`;
    }
  );
}

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
// Extensions to try when resolving a package.json "main" field
const MAIN_EXTENSIONS = ['', '.ts', '.tsx', '.js'];

function tryDirectoryResolve(specifier, dirPath) {
  // Check if the directory has a package.json with a main field
  const pkgJsonPath = pathResolve(dirPath, 'package.json');
  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    if (pkgJson.main) {
      // Try the main field with several extensions (handles extensionless main like "./make_matcher")
      for (const ext of MAIN_EXTENSIONS) {
        const mainPath = pathResolve(dirPath, pkgJson.main + ext);
        try {
          if (statSync(mainPath).isFile()) {
            return { url: pathToFileURL(mainPath).href, shortCircuit: true };
          }
        } catch {
          // continue to next extension
        }
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

/**
 * Try to resolve a bare package import (e.g. '@kbn/picomatcher') when Node's
 * ESM resolver fails because the package's "main" field is extensionless.
 * Finds the package directory in node_modules and delegates to tryDirectoryResolve.
 */
function tryPackageMainResolve(specifier) {
  const parts = specifier.split('/');
  let pkgName;
  if (specifier.startsWith('@')) {
    if (parts.length > 2) return null; // has subpath, not a bare import
    pkgName = parts.slice(0, 2).join('/');
  } else {
    if (parts.length > 1) return null; // has subpath
    pkgName = parts[0];
  }

  const pkgDir = pathResolve(process.cwd(), 'node_modules', pkgName);
  return tryDirectoryResolve(specifier, pkgDir);
}

/**
 * Resolve symlinks for files under node_modules/ to their real paths.
 * This avoids ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: Node refuses
 * to strip types from .ts files under node_modules/, but @kbn/* packages
 * are symlinked there.  Resolving to the real path (outside node_modules)
 * lets --experimental-transform-types work normally.
 */
function resolveSymlinks(result) {
  if (result && result.url && result.url.includes('/node_modules/')) {
    try {
      const filePath = fileURLToPath(result.url);
      const realPath = realpathSync(filePath);
      if (realPath !== filePath) {
        return { ...result, url: pathToFileURL(realPath).href };
      }
    } catch {
      // realpathSync failed (broken symlink, etc.) — return as-is
    }
  }
  return result;
}

export async function resolve(specifier, context, nextResolve) {
  // Try default resolution first
  try {
    return resolveSymlinks(await nextResolve(specifier, context));
  } catch (err) {
    // If a package exports map blocks a deep import, try resolving the file directly.
    // This is needed for type-only imports that are erased at compile time but must
    // still resolve in ESM (resolution happens before compilation).
    if (err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED' || err.code === 'ERR_MODULE_NOT_FOUND') {
      // Try resolving as a subpath file (e.g. @kbn/foo/bar → @kbn/foo/bar.ts)
      const fileResult = tryDirectFileResolve(specifier);
      if (fileResult) return resolveSymlinks(fileResult);

      // Try resolving as a bare package with extensionless "main" field
      const pkgResult = tryPackageMainResolve(specifier);
      if (pkgResult) return resolveSymlinks(pkgResult);
    }

    // Handle directory imports (ESM doesn't support them, but CJS does).
    // Packages like fp-ts use directory imports with package.json main fields.
    if (err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      // Extract the directory path from the error
      const match = err.message.match(/Directory import '([^']+)'/);
      if (match) {
        const result = tryDirectoryResolve(specifier, match[1]);
        if (result) return resolveSymlinks(result);
      }
    }

    // If the specifier ends with .js, try the corresponding .ts/.tsx file.
    // This supports the standard ESM convention where TypeScript sources use
    // .js extensions in imports (which TS resolves to .ts at type-check time).
    if (specifier.endsWith('.js')) {
      const tsSpecifier = specifier.slice(0, -3) + '.ts';
      try {
        return resolveSymlinks(await nextResolve(tsSpecifier, context));
      } catch {
        // try .tsx as well
      }
      const tsxSpecifier = specifier.slice(0, -3) + '.tsx';
      try {
        return resolveSymlinks(await nextResolve(tsxSpecifier, context));
      } catch {
        // fall through to throw original error
      }
      throw err;
    }

    // If the specifier already has a file extension, don't try alternatives
    if (/\.\w+$/.test(specifier)) {
      throw err;
    }

    // Try appending extensions (.ts, .tsx, /index.ts, etc.)
    for (const ext of EXTENSIONS) {
      try {
        return resolveSymlinks(await nextResolve(specifier + ext, context));
      } catch {
        // continue to next extension
      }
    }

    // None of the alternatives worked, throw original error
    throw err;
  }
}

/**
 * Load hook: transforms .ts/.tsx files via esbuild since Node's
 * --experimental-transform-types is strip-only and doesn't support
 * parameter properties, enums, namespaces, or JSX syntax.
 * Also handles JSON imports so they work without explicit import attributes.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    // Transform all .ts/.tsx files via esbuild instead of relying on Node's
    // built-in --experimental-transform-types (strip-only mode). Node's type
    // stripping can only remove type annotations — it cannot transform syntax
    // like parameter properties (`public readonly x`), enums, or namespaces.
    // esbuild handles the full TypeScript feature set.
    const { transformSync } = await import('esbuild');
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, 'utf-8');
    // Inject __dirname/__filename shims when the source uses them — these
    // CJS globals don't exist in ESM scope. The banner is a single line so
    // sourcemap line offsets stay minimal.
    const needsCjsShims = source.includes('__dirname') || source.includes('__filename');
    const banner = needsCjsShims
      ? 'import { fileURLToPath as __esm_fUTP } from "node:url"; import { dirname as __esm_dN } from "node:path"; const __filename = __esm_fUTP(import.meta.url); const __dirname = __esm_dN(__filename);'
      : '';
    const { code } = transformSync(source, {
      loader: url.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'node22',
      sourcefile: filePath,
      sourcemap: 'inline',
      banner,
    });
    // Fix named imports from CJS packages (e.g. lodash) that don't provide
    // ESM named exports. Rewrites to default import + destructuring.
    const fixedCode = fixCjsNamedImports(code);
    return { format: 'module', source: fixedCode, shortCircuit: true };
  }

  // Handle JSON imports: ESM requires `with { type: 'json' }` but most
  // existing code imports JSON without the attribute.  Automatically load
  // .json files as JSON modules so the rest of the codebase doesn't need
  // updating.
  if (url.endsWith('.json')) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, 'utf-8');
    return { format: 'json', source, shortCircuit: true };
  }

  return nextLoad(url, context);
}
