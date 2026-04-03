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
- [ ] `packages/kbn-ci-stats-shipper-cli/ship_ci_stats_cli.ts`: Remove the `[rspack-transition]` conditional in the update command, keep only the rspack command.

## Dev mode

- [ ] `packages/kbn-cli-dev-mode/src/optimizer.ts`: Remove the `KBN_USE_RSPACK` conditional, keep only rspack path.
- [ ] Environment documentation: Remove `KBN_USE_RSPACK` references.

## Package rename

- [ ] `packages/kbn-rspack-optimizer/`: Rename to `packages/kbn-optimizer/` (reclaiming the name from the deleted legacy package). Update all imports and `kibana.jsonc` references.
- [ ] Delete this `LEGACY_REMOVAL_CHECKLIST.md` file (no longer needed).

## Total: ~12 files with deletions, 0 files with structural changes.
