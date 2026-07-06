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
 * module. Rspack's DllReferencePlugin supports `exportsType` and
 * `defaultObject` natively (aligned with webpack's Module.getExportsType in
 * rspack PR #5502), but `defaultObject: "redirect-warn"` uses a different
 * shape than webpack's plain string, so we normalise it to `"redirect"`.
 *
 * Sanitisation strategy (all Kibana code is strict ESM):
 *
 *  - `exportsType: "namespace"` → keep. True ESM; named imports work.
 *
 *  - `exportsType: "flagged"` (+ `defaultObject: "redirect"|"redirect-warn"`)
 *    → keep as `{ exportsType: "flagged" }`. Strict importers get
 *    "default-with-named": `import X` = `module.exports`, named imports =
 *    `module.exports.prop`. This is identical to webpack's behaviour and
 *    correct for CJS modules that set `__esModule = true`.
 *
 *  - `exportsType: "dynamic"` (+ `defaultObject: "redirect"|"redirect-warn"`)
 *    → normalise to `{ exportsType: "flagged" }`. For strict importers
 *    "dynamic" and "flagged" produce the same "default-with-named" result,
 *    and "flagged" avoids a potential rspack code-gen gap with "dynamic" in
 *    delegated modules.
 *
 *  - `exportsType: "default"` + `defaultObject: "redirect"|"redirect-warn"`
 *    → strip buildMeta (keep entry). Pure CJS modules where
 *    `module.exports` IS the value (no `__esModule`). Keeping the entry
 *    lets DllReferencePlugin resolve them from the DLL instead of rspack
 *    re-bundling them — avoiding duplicate module instances that break
 *    shared state (React contexts, singletons). Same treatment as the
 *    catch-all "everything else" category below.
 *
 *  - Everything else → strip buildMeta (no named imports expected).
 *
 * NOTE: This can be removed once we delete the legacy optimizer and emit
 * the DLL with rspack directly.
 */
export function loadDllManifest() {
  const raw = JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));

  for (const [, entry] of Object.entries(raw.content) as Array<
    [string, { buildMeta?: { exportsType?: string; defaultObject?: string | boolean } }]
  >) {
    if (entry.buildMeta) {
      const { exportsType, defaultObject } = entry.buildMeta;

      if (exportsType === 'namespace') {
        entry.buildMeta = { exportsType };
      } else if (
        exportsType === 'flagged' &&
        (defaultObject === 'redirect' || defaultObject === 'redirect-warn')
      ) {
        entry.buildMeta = { exportsType: 'flagged' };
      } else if (
        exportsType === 'dynamic' &&
        (defaultObject === 'redirect' || defaultObject === 'redirect-warn')
      ) {
        entry.buildMeta = { exportsType: 'flagged' };
      } else {
        entry.buildMeta = undefined;
      }
    }
  }

  return raw;
}
