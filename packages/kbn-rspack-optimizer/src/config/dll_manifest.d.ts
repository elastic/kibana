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
export declare function loadDllManifest(): any;
