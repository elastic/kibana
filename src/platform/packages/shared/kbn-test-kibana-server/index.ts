/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { DedicatedTaskRunnerConfig } from './src/dedicated_task_runner';
export type { KibanaTestServerLaunchConfig } from './src/kibana_test_server_launch_config';
export type { RunKibanaServerOptions } from './src/run_kibana_server';
export { runKibanaServer } from './src/run_kibana_server';
export type { ArgValue, KibanaCliArg } from './src/kibana_cli_args';
export {
  getArgValue,
  getKibanaCliArg,
  getKibanaCliLoggers,
  parseRawFlags,
  remapPluginPaths,
} from './src/kibana_cli_args';
