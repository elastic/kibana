/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RunWithCommands } from '@kbn/dev-cli-runner';
import { runCmd } from './run_cmd';
import { compareCmd } from './compare_cmd';
import { compareRefsCmd } from './compare_refs_cmd';
// [rspack-transition] Remove this import when the legacy optimizer is removed
import { compareOptimizersCmd } from './compare_optimizers_cmd';

export async function cli() {
  await new RunWithCommands(
    {
      description: 'Lighthouse performance benchmarking CLI for Kibana',
      usage: 'node scripts/perf_page_load.js <command> [options]',
    },
    [
      runCmd,
      compareCmd,
      compareRefsCmd,
      // [rspack-transition] Remove this command when the legacy optimizer is removed
      compareOptimizersCmd,
    ]
  ).execute();
}
