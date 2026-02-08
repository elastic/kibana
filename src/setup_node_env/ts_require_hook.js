/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * CJS require hook for TypeScript support — replaces babel-register.
 *
 * Uses esbuild to compile .ts/.tsx files to CJS on-the-fly.
 * This means `import { x } from 'lodash'` becomes `const { x } = require('lodash')`,
 * avoiding the ESM/CJS interop issues that arise when Node loads CJS packages as ESM.
 *
 * Also patches Module._resolveFilename so `require('./foo')` tries `.ts` extensions.
 */

'use strict';

const { readFileSync } = require('fs');
const { transformSync } = require('esbuild');
const Module = require('module');

// Patch _resolveFilename to try .ts and .tsx extensions when resolution fails
const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return origResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    // For relative paths, absolute paths, and @kbn/* packages
    if (request.startsWith('.') || request.startsWith('/') || request.startsWith('@kbn/')) {
      // Try .ts
      try {
        return origResolveFilename.call(this, request + '.ts', parent, isMain, options);
      } catch {}

      // Try .tsx
      try {
        return origResolveFilename.call(this, request + '.tsx', parent, isMain, options);
      } catch {}

      // Try /index.ts (for directory-style imports)
      try {
        return origResolveFilename.call(this, request + '/index.ts', parent, isMain, options);
      } catch {}

      // Try /index.tsx
      try {
        return origResolveFilename.call(this, request + '/index.tsx', parent, isMain, options);
      } catch {}
    }

    throw err;
  }
};

// Register .ts and .tsx extension handlers that compile to CJS via esbuild
const tsExtensions = ['.ts', '.tsx'];
for (const ext of tsExtensions) {
  require.extensions[ext] = function (module, filename) {
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
