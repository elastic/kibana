/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type ModuleNamespace = Record<string, unknown> & { default?: Record<string, unknown> };

/**
 * Reads a named export off a dynamically imported CommonJS package, tolerating a bundler that kept
 * only `default` on the imported module namespace.
 *
 * A plain `const { X } = await import('cjs-pkg')` works when Node (or a bundler) resolves the
 * dynamic import directly, but esbuild's code splitting can drop the named re-export it otherwise
 * synthesizes for a CommonJS dependency when that dependency is reached only through one dynamic
 * `import()` call (its sole consumer): the split chunk it produces for that module then exports
 * `default` alone, and the named destructure silently reads `undefined`. Both shapes resolve here,
 * so the same call site works whether or not its dynamic import ends up in a split chunk.
 */
export const dynamicCjsExport = <T>(moduleNamespace: ModuleNamespace, exportName: string): T =>
  (moduleNamespace[exportName] ?? moduleNamespace.default?.[exportName]) as T;
