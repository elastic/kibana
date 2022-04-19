/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error
import { getOptimizerBuiltPaths } from '@kbn/optimizer/target_node/optimizer/optimizer_built_paths';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

it(`finds all the optimizer files relative to it's path`, async () => {
  const paths = await getOptimizerBuiltPaths();
  expect(paths).toMatchInlineSnapshot(`
    Array [
      <absolute path>/node_modules/@kbn/optimizer/target_node/cli.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/array_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/bundle_cache.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/bundle_refs.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/bundle.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/compiler_messages.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/dll_manifest.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/event_stream_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/hashes.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/index.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/obj_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/parse_path.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/rxjs_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/theme_tags.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/ts_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/worker_config.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/common/worker_messages.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/index.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/limits.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/log_optimizer_progress.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/log_optimizer_state.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/assign_bundles_to_workers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/bundle_cache.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/diff_cache_key.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/filter_by_id.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/focus_bundles.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/get_plugin_bundles.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/handle_optimizer_completion.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/index.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/kibana_platform_plugins.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/observe_stdio.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/observe_worker.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/optimizer_built_paths.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/optimizer_cache_key.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/optimizer_config.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/optimizer_state.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/run_workers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/watch_bundles_for_changes.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/optimizer/watcher.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/report_optimizer_timings.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/run_optimizer.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/bundle_metrics_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/bundle_ref_module.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/bundle_refs_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/emit_stats_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/entry_point_creator.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/populate_bundle_cache_plugin.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/run_compilers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/run_worker.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/theme_loader.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/webpack_helpers.js,
      <absolute path>/node_modules/@kbn/optimizer/target_node/worker/webpack.config.js,
    ]
  `);
});
