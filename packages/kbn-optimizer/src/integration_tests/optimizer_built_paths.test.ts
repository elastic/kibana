/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getOptimizerBuiltPaths } from '../optimizer/optimizer_built_paths';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

it(`finds all the optimizer files relative to it's path`, async () => {
  const paths = await getOptimizerBuiltPaths();
  expect(paths).toMatchInlineSnapshot(`
    Array [
      <absolute path>/packages/kbn-optimizer/src/cli.ts,
      <absolute path>/packages/kbn-optimizer/src/common/array_helpers.ts,
      <absolute path>/packages/kbn-optimizer/src/common/bundle_cache.ts,
      <absolute path>/packages/kbn-optimizer/src/common/bundle_refs.ts,
      <absolute path>/packages/kbn-optimizer/src/common/bundle.ts,
      <absolute path>/packages/kbn-optimizer/src/common/compiler_messages.ts,
      <absolute path>/packages/kbn-optimizer/src/common/dll_manifest.ts,
      <absolute path>/packages/kbn-optimizer/src/common/event_stream_helpers.ts,
      <absolute path>/packages/kbn-optimizer/src/common/hashes.ts,
      <absolute path>/packages/kbn-optimizer/src/common/index.ts,
      <absolute path>/packages/kbn-optimizer/src/common/obj_helpers.ts,
      <absolute path>/packages/kbn-optimizer/src/common/parse_path.ts,
      <absolute path>/packages/kbn-optimizer/src/common/rxjs_helpers.ts,
      <absolute path>/packages/kbn-optimizer/src/common/theme_tags.ts,
      <absolute path>/packages/kbn-optimizer/src/common/ts_helpers.ts,
      <absolute path>/packages/kbn-optimizer/src/common/worker_config.ts,
      <absolute path>/packages/kbn-optimizer/src/common/worker_messages.ts,
      <absolute path>/packages/kbn-optimizer/src/limits.ts,
      <absolute path>/packages/kbn-optimizer/src/log_optimizer_progress.ts,
      <absolute path>/packages/kbn-optimizer/src/log_optimizer_state.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/assign_bundles_to_workers.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/bundle_cache.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/diff_cache_key.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/filter_by_id.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/focus_bundles.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/get_plugin_bundles.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/handle_optimizer_completion.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/index.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/kibana_platform_plugins.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/observe_stdio.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/observe_worker.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/optimizer_built_paths.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/optimizer_cache_key.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/optimizer_config.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/optimizer_state.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/run_workers.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/watch_bundles_for_changes.ts,
      <absolute path>/packages/kbn-optimizer/src/optimizer/watcher.ts,
      <absolute path>/packages/kbn-optimizer/src/report_optimizer_timings.ts,
      <absolute path>/packages/kbn-optimizer/src/run_optimizer.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/bundle_metrics_plugin.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/bundle_ref_module.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/bundle_refs_plugin.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/emit_stats_plugin.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/entry_point_creator.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/populate_bundle_cache_plugin.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/run_compilers.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/run_worker.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/theme_loader.ts,
      <absolute path>/packages/kbn-optimizer/src/worker/webpack.config.ts,
    ]
  `);
});
