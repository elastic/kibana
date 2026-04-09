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
 * Pre-built DLL manifest from @kbn/ui-shared-deps-npm.
 * Contains modules (npm deps + transitive deps) that are already bundled
 * into the DLL script (__kbnSharedDeps_npm__). DllReferencePlugin uses this to
 * avoid re-bundling those modules in plugin chunks.
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
 *  - `defaultObject: "redirect" | "redirect-warn"` → promote to "namespace".
 *    In webpack these modules redirect named imports to module.exports
 *    properties; "namespace" achieves the same in rspack by generating
 *    property access (e.g. `mod.format`) for each named import.
 *  - Everything else → strip buildMeta entirely (default-only CJS or modules
 *    without export metadata; no named imports expected).
 *
 * NOTE: This can be removed once we delete the legacy optimizer and promote this one to be the optimizer.
 */
export const DLL_MANIFEST = (() => {
  const raw = JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));
  for (const entry of Object.values(raw.content) as Array<{
    buildMeta?: { exportsType?: string; defaultObject?: string | boolean };
  }>) {
    if (entry.buildMeta) {
      const { exportsType, defaultObject } = entry.buildMeta;
      if (exportsType === 'namespace') {
        entry.buildMeta = { exportsType };
      } else if (defaultObject === 'redirect' || defaultObject === 'redirect-warn') {
        entry.buildMeta = { exportsType: 'namespace' };
      } else {
        entry.buildMeta = undefined;
      }
    }
  }
  return raw;
})();
