/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error
import { getOptimizerBuiltPaths } from '@kbn/optimizer/target_node/src/optimizer/optimizer_built_paths';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

it(`finds all the optimizer files relative to it's path`, async () => {
  const paths = await getOptimizerBuiltPaths();
  expect(paths).toMatchInlineSnapshot(`
    Array [
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/cli.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/array_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/bundle_cache.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/bundle_refs.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/bundle.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/compiler_messages.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/dll_manifest.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/event_stream_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/hashes.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/index.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/obj_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/parse_path.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/rxjs_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/theme_tags.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/ts_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/worker_config.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/common/worker_messages.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/limits.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/log_optimizer_progress.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/log_optimizer_state.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/assign_bundles_to_workers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/bundle_cache.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/diff_cache_key.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/filter_by_id.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/focus_bundles.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/get_plugin_bundles.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/handle_optimizer_completion.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/index.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/kibana_platform_plugins.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/observe_stdio.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/observe_worker.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/optimizer_built_paths.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/optimizer_cache_key.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/optimizer_config.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/optimizer_state.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/run_workers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/watch_bundles_for_changes.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/optimizer/watcher.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/report_optimizer_timings.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/run_optimizer.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/bundle_metrics_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/bundle_ref_module.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/bundle_refs_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/emit_stats_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/entry_point_creator.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/populate_bundle_cache_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/run_compilers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/run_worker.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/theme_loader.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/src/worker/webpack.config.js,
    ]
  `);
});
