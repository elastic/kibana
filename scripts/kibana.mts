/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { transformSync } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// Extensions to try for extensionless imports, in priority order
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '/index.js'];

// Packages that must NOT be transformed — they are loaded as ESM by this
// script and by the Vite dev server infrastructure.
const SKIP_TRANSFORM = ['kbn-vite-server', 'kbn-vite-config'];

// ---------- CJS resolution & compilation hooks ----------
// registerHooks only intercepts ESM resolution. CJS require() / require.resolve()
// goes through Module._resolveFilename directly, so we need to patch it too.
const _require = createRequire(import.meta.url);
const Module = _require('module');

const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  try {
    return origResolveFilename.call(this, request, parent, isMain, options);
  } catch (err: unknown) {
    // For relative paths, absolute paths, and @kbn/* packages — try .ts extensions
    if (request.startsWith('.') || request.startsWith('/') || request.startsWith('@kbn/')) {
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        try {
          return origResolveFilename.call(this, request + ext, parent, isMain, options);
        } catch {
          // continue
        }
      }
    }
    throw err;
  }
};

// Register .ts/.tsx extension handlers so CJS require() can compile TypeScript
for (const ext of ['.ts', '.tsx'] as const) {
  _require.extensions[ext] = function (module: any, filename: string) {
    const source = readFileSync(filename, 'utf-8');
    const { code } = transformSync(source, {
      loader: ext === '.tsx' ? 'tsx' : 'ts',
      format: 'cjs',
      target: 'node22',
      sourcefile: filename,
      sourcemap: 'inline',
    });
    module._compile(code, filename);
  };
}

// ---------- ESM resolution & loading hooks ----------
registerHooks({
  resolve(
    specifier: string,
    context: { parentURL?: string; conditions?: string[] },
    nextResolve: Function
  ) {
    try {
      return nextResolve(specifier, context);
    } catch (err: unknown) {
      // .js → .ts/.tsx remapping: when a .js import fails, try the
      // corresponding .ts/.tsx file. This supports the standard ESM
      // convention where TypeScript sources use .js extensions in
      // imports (which TS resolves to .ts at type-check time).
      if (specifier.endsWith('.js')) {
        try {
          return nextResolve(specifier.slice(0, -3) + '.ts', context);
        } catch {
          // continue
        }
        try {
          return nextResolve(specifier.slice(0, -3) + '.tsx', context);
        } catch {
          // fall through to throw original error
        }
        throw err;
      }

      if (/\.\w+$/.test(specifier)) {
        throw err;
      }

      for (const ext of EXTENSIONS) {
        try {
          return nextResolve(specifier + ext, context);
        } catch {
          // continue
        }
      }

      throw err;
    }
  },

  load(url: string, context: { format?: string; conditions?: string[] }, nextLoad: Function) {
    // Transform .ts/.tsx files to CJS using esbuild. This replaces
    // babel-register for files loaded via Node's native module system.
    // Without this, `import { x } from 'moment'` fails because Node's
    // ESM loader can't extract named exports from CJS packages.
    //
    // Skip infrastructure packages that need native ESM loading.
    const isTs = url.endsWith('.ts') || url.endsWith('.tsx');
    const isSrcJs =
      url.endsWith('.js') && !url.includes('/target/') && !url.includes('/node_modules/');

    // Transform source .ts/.tsx and .js files to CJS via esbuild.
    // This replaces babel-register for files loaded via Node's module system.
    if (
      url.startsWith('file://') &&
      (isTs || isSrcJs) &&
      !SKIP_TRANSFORM.some((pkg) => url.includes(pkg))
    ) {
      const filePath = fileURLToPath(url);
      try {
        const source = readFileSync(filePath, 'utf-8');
        // Determine the esbuild loader based on file extension
        let loader: 'ts' | 'tsx' | 'js' | 'jsx' = 'js';
        if (url.endsWith('.tsx')) loader = 'tsx';
        else if (url.endsWith('.ts')) loader = 'ts';

        const { code } = transformSync(source, {
          loader,
          format: 'cjs',
          target: 'node22',
          sourcefile: filePath,
          sourcemap: 'inline',
        });
        return { format: 'commonjs', source: code, shortCircuit: true };
      } catch {
        // If esbuild transform fails, fall through to default loading
        return nextLoad(url, context);
      }
    }

    return nextLoad(url, context);
  },
});

// Bootstrap Vite Module Runner for TypeScript support
const { createViteServerRuntime } = await import('@kbn/vite-server');
const isDevCliChild = process.env.isDevCliChild === 'true';

const runtime = await createViteServerRuntime({
  repoRoot: REPO_ROOT,
  // Child process needs HMR for ongoing server-side hot reload.
  // Parent only loads CliDevMode once — no HMR or watcher needed.
  hmr: isDevCliChild,
});

// Load and execute the Kibana dev CLI through Vite
await runtime.executeModule(resolve(REPO_ROOT, 'src/cli/kibana/dev.ts'));

if (isDevCliChild) {
  // Store the runtime for reuse by the Module Loader (avoids creating a second
  // Vite instance in Server.preboot). See kbn-vite-server/src/vite_module_loader.ts
  (globalThis as any).__kbnViteRuntime = runtime;
}
// Note: we do NOT call runtime.stop() in the parent process because CliDevMode
// code loaded through the Module Runner uses dynamic imports (e.g.
// `await import('@kbn/cli-dev-mode')`) that require the Module Runner to stay
// alive. The parent's Vite instance is lightweight (no watcher, no HMR) so the
// ongoing cost is minimal — just the transformation pipeline in memory.
