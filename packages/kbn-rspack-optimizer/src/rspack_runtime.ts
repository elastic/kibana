/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { rspack as rspackValue, RspackPluginInstance } from '@rspack/core';
import type { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';

/**
 * `@rspack/core` (and `@rspack/plugin-react-refresh`) are published as pure
 * ESM since v2. Production code paths load them fine through Node's native
 * require(esm) support (Node >= 22.12), but Jest's CJS module registry cannot
 * load ESM modules at all, and babel-jest cannot transpile them for Jest
 * either because the published bundles use `import.meta` (which has no CJS
 * equivalent).
 *
 * Loading through a native `createRequire` defers to Node's native ESM
 * support. Note that `require('module')` inside Jest's sandbox returns a
 * `Module` subclass whose `createRequire` is replaced with Jest's own
 * registry — so we reach the real builtin via `process.getBuiltinModule`,
 * which Jest cannot intercept. The same code path works in Jest tests, the
 * swc-register worker, and the dev CLI.
 */
const nativeRequire = process.getBuiltinModule('module').createRequire(__filename);

/**
 * The real `rspack` export from `@rspack/core`, loaded natively.
 * Use this instead of `import { rspack } from '@rspack/core'` in any module
 * that Jest tests may load. Type-only imports from '@rspack/core' are erased
 * at compile time and remain fine.
 */
export const rspack: typeof rspackValue = nativeRequire('@rspack/core').rspack;

type ReactRefreshRspackPluginCtor = typeof ReactRefreshRspackPlugin;

/**
 * Lazily load the ReactRefreshRspackPlugin (HMR builds only).
 */
export function loadReactRefreshRspackPlugin(): ReactRefreshRspackPluginCtor {
  return nativeRequire('@rspack/plugin-react-refresh').ReactRefreshRspackPlugin;
}

/**
 * Lazily load the RsdoctorRspackPlugin (profile builds only).
 */
export function loadRsdoctorRspackPlugin(): new (
  options: Record<string, unknown>
) => RspackPluginInstance {
  return nativeRequire('@rsdoctor/rspack-plugin').RsdoctorRspackPlugin;
}
