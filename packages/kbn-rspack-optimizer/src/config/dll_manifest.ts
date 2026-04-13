/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';

/**
 * Load and sanitise the pre-built DLL manifest from @kbn/ui-shared-deps-npm.
 *
 * The manifest lists modules (npm deps + transitive deps) already bundled
 * into the DLL script (__kbnSharedDeps_npm__). DllReferencePlugin uses it to
 * avoid re-bundling those modules in plugin chunks.
 *
 * IMPORTANT: this function reads the manifest lazily (at call time, not at
 * import time). During distributable builds the DLL is rebuilt by
 * BuildPackages *after* all task modules have been imported, so an
 * eagerly-evaluated constant would capture a stale manifest with wrong
 * module IDs. The legacy optimizer avoids this because it runs webpack
 * inside forked worker processes that start after the DLL rebuild.
 *
 * The manifest is built by webpack's DllPlugin and contains `buildMeta` per
 * module. Rspack's DllReferencePlugin has two compatibility gaps:
 *
 *  1. It panics (Rust crash) on `defaultObject` and `strictHarmonyModule`.
 *  2. It does not generate runtime CJS interop for delegated modules with
 *     `exportsType: "dynamic"` — named imports are statically replaced with
 *     `undefined` instead of being resolved to module.exports properties.
 *
 * Sanitisation strategy:
 *  - `exportsType: "namespace"` → keep (true ESM, named imports work directly).
 *  - `defaultObject: "redirect" | "redirect-warn"` with `exportsType: "flagged"`
 *    → promote to "namespace". These modules have `__esModule: true`, so
 *    `.default` exists and named imports map to `module.exports` properties.
 *  - `defaultObject: "redirect" | "redirect-warn"` with `exportsType: "default"`
 *    → REMOVE from manifest. These are pure CJS modules where `module.exports`
 *    IS the default value (no `__esModule` flag). Using "namespace" makes rspack
 *    look for `.default` which doesn't exist (`import url from 'url'` → crash).
 *    Removing from the manifest lets rspack bundle the polyfill directly with
 *    correct CJS interop. `defaultObject` itself causes a Rust panic so can't
 *    be preserved.
 *  - `defaultObject: "redirect"` with `exportsType: "dynamic"` → promote to
 *    "namespace". These are CJS wrappers (e.g. `react/index.js`) that typically
 *    go through explicit externals anyway. "namespace" preserves named imports.
 *  - Everything else → strip buildMeta entirely (no named imports expected).
 *
 * NOTE: This can be removed once we delete the legacy optimizer and promote this one to be the optimizer.
 */
export function loadDllManifest() {
  const raw = JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));
  const keysToRemove: string[] = [];

  for (const [key, entry] of Object.entries(raw.content) as Array<
    [string, { buildMeta?: { exportsType?: string; defaultObject?: string | boolean } }]
  >) {
    if (entry.buildMeta) {
      const { exportsType, defaultObject } = entry.buildMeta;
      if (exportsType === 'namespace') {
        entry.buildMeta = { exportsType };
      } else if (defaultObject === 'redirect' || defaultObject === 'redirect-warn') {
        if (exportsType === 'default') {
          // Pure CJS — remove from DLL so rspack bundles it directly with
          // correct interop (both default and named imports work).
          keysToRemove.push(key);
        } else {
          // flagged, dynamic, or other — "namespace" is safe because either
          // __esModule provides .default, or the module is resolved via
          // explicit externals rather than through the DLL reference.
          entry.buildMeta = { exportsType: 'namespace' };
        }
      } else {
        entry.buildMeta = undefined;
      }
    }
  }

  for (const key of keysToRemove) {
    delete raw.content[key];
  }

  return raw;
}
