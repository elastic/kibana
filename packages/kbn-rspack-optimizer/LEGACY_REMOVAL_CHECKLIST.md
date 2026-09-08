# Legacy Optimizer Removal Checklist

When the time comes to make rspack the default and remove the legacy webpack optimizer,
the following is an exhaustive list of what to change. Every item is a **pure deletion
or simplification** -- no structural refactoring required. All conditional code is tagged
with `[rspack-transition]` comments for easy discovery via `grep -r 'rspack-transition'`.

## Build pipeline

- [ ] `src/dev/build/build_distributables.ts`: Remove the `if (KBN_USE_RSPACK)` conditional, keep only `Tasks.BuildRspackBundles`. Optionally rename `BuildRspackBundles` to `BuildBundles`.
- [ ] `src/dev/build/tasks/build_rspack_bundles_task.ts`: Rename file to `build_bundles_task.ts`.
- [ ] `src/dev/build/tasks/build_kibana_platform_plugins.ts`: Delete the entire file.
- [ ] `src/dev/build/tasks/index.ts`: Remove the `build_kibana_platform_plugins` export.
- [ ] `packages/kbn-optimizer/`: Delete the entire package (webpack optimizer, workers, limits.yml).

## Server and bin scripts

- [ ] `src/core/packages/apps/server-internal/src/bundle_routes/register_bundle_routes.ts`: Delete `isRspackMode()` function. Remove the `else` (legacy webpack) branch. The rspack branch becomes the only code path. Remove `KBN_USE_RSPACK` references. Clean up `publicTargetDir` usage for internal plugins (external plugins still need it).
- [ ] `src/core/packages/rendering/server-internal/src/bootstrap/bootstrap_renderer.ts`: Delete `isRspackModeEnabled()` function. Remove the `else` (legacy) branch. The rspack branch becomes the only code path. Remove `KBN_USE_RSPACK` references.
- [ ] `src/dev/build/tasks/bin/scripts/kibana`: Remove `{{#rspack}}export KBN_USE_RSPACK=true{{/rspack}}` block.
- [ ] `src/dev/build/tasks/bin/scripts/kibana.bat`: Remove `{{#rspack}}set KBN_USE_RSPACK=true{{/rspack}}` block.
- [ ] `src/dev/build/tasks/bin/copy_bin_scripts_task.ts`: Remove the `rspack` Mustache variable from `templateVars`.

## CDN assets

- [ ] `src/dev/build/tasks/create_cdn_assets_task.ts`: Delete the `else` (legacy) branch in the bundle copy logic. Only the rspack `target/public/bundles/` copy remains.

## CI

- [ ] `.buildkite/scripts/steps/build_kibana.sh`: Remove the `[rspack-transition]` cache type validation block. Restore the simple 3-line script (bootstrap + build + post_build).
- [ ] `.buildkite/pipelines/pull_request/base.yml`: Restore the `if:` condition from the comment. Remove the `[rspack-transition]` comment.
- [ ] `.buildkite/scripts/download_build_artifacts.sh`: Remove the `kibana-effective-build-id` metadata lookup. Revert to `${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}`.
- [ ] `.buildkite/scripts/post_build_kibana.sh`: Remove the `kibana-build-type.txt` upload block. Remove `KBN_USE_RSPACK` references.
- [ ] `.buildkite/scripts/build_kibana.sh`: Remove the `is_pr_with_label "ci:build-with-rspack-optimizer"` line (no longer conditional).
- [ ] `.buildkite/pipeline-utils/pr_labels.ts`: Remove the `ci:build-with-rspack-optimizer` mapping from `LABEL_MAPPING`.
- [ ] `.buildkite/scripts/steps/checks/bundle_limits.sh`: Remove the legacy `node scripts/build_kibana_platform_plugins --validate-limits` line and the `[rspack-transition]` comment.
- [ ] `packages/kbn-ci-stats-shipper-cli/ship_ci_stats_cli.ts`: Remove the `[rspack-transition]` conditional in the update command, keep only the rspack command. Rspack bundle-limit errors already use one shared `To update the limit…` + `build_rspack_bundles --update-limits` footer after all overage lines; after legacy removal, delete only the legacy branch that emits per-plugin `build_kibana_platform_plugins --focus …` lines.
- [ ] `.buildkite/pipelines/pull_request/base.yml`: Remove the `Verify Rspack Optimizer Build` step (no longer needed when Rspack is the only optimizer).
- [ ] `.buildkite/scripts/steps/verify_rspack_build.sh`: Delete the file.
- [ ] `.buildkite/scripts/pipelines/pull_request/pipeline.ts`: Remove `verify_rspack_build` from the `cancel_on_gate_failure` registration loop.

## Dev mode

- [ ] `packages/kbn-cli-dev-mode/src/optimizer.ts`: Remove the `KBN_USE_RSPACK` conditional, keep only rspack path.
- [ ] Environment documentation: Remove `KBN_USE_RSPACK` references.

## Performance benchmarks

- [ ] `packages/kbn-perf-page-load/src/cli/compare_optimizers_cmd.ts`: Delete the entire file (compare-optimizers command). Remove `compareOptimizersCmd` import and registration from `cli/index.ts`.
- [ ] `packages/kbn-perf-page-load/src/cli/run_cmd.ts`: Remove the `[rspack-transition]` legacy build branch (the `build_kibana_platform_plugins.js --dist` code path).

## Tests

These test files contain `KBN_USE_RSPACK` or `isRspackMode`-gated branches that should be
simplified once the legacy optimizer is removed. Each item is a **pure simplification** --
delete the legacy branch/assertions and keep only the rspack assertions.

- [ ] `src/dev/build/build_distributables.test.ts`: Delete the "runs BuildKibanaPlatformPlugins when KBN_USE_RSPACK is not set" test case and the "any value other than true" case. The "runs BuildRspackBundles" case becomes the only test (and no longer needs the env var setup).
- [ ] `src/dev/build/tasks/create_cdn_assets_task.test.ts`: Delete the legacy bundle path test cases. The rspack "copies unified rspack bundles" case becomes the only test.
- [ ] `packages/kbn-cli-dev-mode/src/optimizer.test.ts`: Delete the `describe('rspack path', ...)` wrapper -- promote its tests to top level. Delete the "falls back to webpack" test. Remove the `@kbn/optimizer` mock and the legacy optimizer tests ("uses options to create valid OptimizerConfig", etc.).
- [ ] `src/core/packages/apps/server-internal/src/bundle_routes/register_bundle_routes.test.ts`: Delete the `describe('rspack mode', ...)` wrapper and the "when KBN_USE_RSPACK is unset" regression guard. Promote the rspack route tests to top level.
- [ ] `src/core/packages/rendering/server-internal/src/rendering_service.test.ts`: Remove the `isRspackModeEnabledMock` toggle. The `describe('rspack mode metadata', ...)` assertions (preload fonts, font-display:swap) should apply unconditionally.
- [ ] `src/core/packages/rendering/server-internal/src/rendering_service.test.mocks.ts`: Remove the `isRspackModeEnabled` mock export.
- [ ] `packages/kbn-ci-stats-shipper-cli/ship_ci_stats_cli.test.ts`: Delete the "does not include kbn-rspack-optimizer" test case that asserts the legacy update command. The rspack update command test becomes the only case.
- [ ] `packages/kbn-plugin-helpers/src/integration_tests/build.test.ts`: Delete the original "builds a generated plugin into a viable archive" test (legacy webpack path). The "[rspack-transition]" rspack build test becomes the sole build test. Remove `KBN_USE_RSPACK` env override (it will be the default).
- [ ] `x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/tests/discover_cdp_perf.spec.ts`: Delete the legacy `else` branch (`toStrictEqual` for webpack-only labels) and `RSPACK_ONLY_BUNDLE_LABELS`; keep a single assertion set for unified RSPack bundles only.
- [ ] `src/platform/packages/shared/kbn-test/src/functional_tests/run_tests/run_tests.ts`: Remove the `[rspack-transition]` conditional; keep only the rspack build script reference (`node scripts/build_rspack_bundles`, or its successor name after the package rename).

## Package rename

- [ ] `packages/kbn-rspack-optimizer/`: Rename to `packages/kbn-optimizer/` (reclaiming the name from the deleted legacy package). Update all imports and `kibana.jsonc` references.
- [ ] Delete this `LEGACY_REMOVAL_CHECKLIST.md` file (no longer needed).

## Total: ~26 files with deletions/simplifications, 0 files with structural changes.
