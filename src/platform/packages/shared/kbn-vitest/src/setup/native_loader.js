/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The Jest resolver and transforms covered things Node's loader rejects when Vitest leaves
// node_modules and `require()` to it:
// - style imports were stubbed for every module (e.g. monaco-editor's ESM build `import './x.css'`);
// - ESM packages with extensionless relative imports (e.g. monaco-promql) were transformed to
//   CommonJS and resolved like `require()`.

import { registerHooks } from 'module';

const STYLE_FILE = /\.(css|less|scss)$/;
const HOOKS = Symbol.for('kbn.vitest.nativeLoaderHooks');

const isExtensionlessRelativeImportInNodeModules = (specifier, context) =>
  /^\.\.?\//.test(specifier) &&
  !/\.[cm]?js$/.test(specifier) &&
  Boolean(context.parentURL?.includes('/node_modules/'));

// Setup files run once per test file in the same worker process; register the hooks once.
global[HOOKS] ??= registerHooks({
  resolve: (specifier, context, nextResolve) => {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error?.code !== 'ERR_MODULE_NOT_FOUND' ||
        !isExtensionlessRelativeImportInNodeModules(specifier, context)
      ) {
        throw error;
      }
      return nextResolve(`${specifier}.js`, context);
    }
  },
  load: (url, context, nextLoad) =>
    STYLE_FILE.test(url)
      ? {
          format: context.format === 'commonjs' ? 'commonjs' : 'module',
          source: '',
          shortCircuit: true,
        }
      : nextLoad(url, context),
});
