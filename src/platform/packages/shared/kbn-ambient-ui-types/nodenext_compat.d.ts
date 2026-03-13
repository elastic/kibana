/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Under module: "nodenext" with CJS files (no "type": "module" in package.json),
 * dynamic import() of a CJS module wraps module.exports as the default:
 *   import('./foo.js') → Promise<{ default: typeof module.exports }>
 *
 * For files with `export default Component`, this produces a union type:
 *   Promise<{ default: Component } | { default: { default: Component, ...named } }>
 *
 * React.lazy expects Promise<{ default: Component }>, so we use a conditional
 * type to extract the component from either ESM or CJS-wrapped module shapes.
 * At runtime, webpack and babel handle the actual unwrapping.
 */
type ExtractLazyDefault<M> = M extends { default: infer T extends ComponentType<any> }
  ? T
  : M extends { default: { default: infer T extends ComponentType<any> } }
  ? T
  : never;

declare module 'react' {
  function lazy<M extends { default: any }>(
    factory: () => Promise<M>
  ): LazyExoticComponent<ExtractLazyDefault<M>>;
}
