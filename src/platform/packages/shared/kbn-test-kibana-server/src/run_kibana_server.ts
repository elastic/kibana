/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Os from 'os';

import { v4 as uuidv4 } from 'uuid';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/repo-info';

import { DedicatedTaskRunnerConfig } from './dedicated_task_runner';
import type { KibanaTestServerLaunchConfig } from './kibana_test_server_launch_config';
import { getArgValue, parseRawFlags, remapPluginPaths } from './kibana_cli_args';

export interface RunKibanaServerOptions {
  procs: ProcRunner;
  config: KibanaTestServerLaunchConfig;
  installDir?: string;
  extraKbnOpts?: string[];
  logsDir?: string;
  onEarlyExit?: (msg: string) => void;
  inspect?: boolean;
  remote?: boolean;
  /**
   * Prefix for UI process `path.data` temp dir (`${prefix}-ui-<uuid>`). FTR default: `ftr`. Scout uses `scout`.
   */
  uiEphemeralDirPrefix?: string;
  /**
   * Prefix for task-runner `path.data` temp dir (`${prefix}-task-runner-<uuid>`). Default: `ftr`.
   */
  taskRunnerEphemeralDirPrefix?: string;
}

export async function runKibanaServer(options: RunKibanaServerOptions) {
  const { config, procs } = options;
  const uiPrefix = options.uiEphemeralDirPrefix ?? 'ftr';
  const taskPrefix = options.taskRunnerEphemeralDirPrefix ?? 'ftr';

  const runOptions = options.config.get('kbnTestServer.runOptions') as {
    alwaysUseSource?: boolean;
    wait?: boolean | RegExp;
  };
  const installDir = runOptions.alwaysUseSource ? undefined : options.installDir;
  const devMode = !installDir;
  const useTaskRunner = options.config.get('kbnTestServer.useDedicatedTaskRunner') as boolean;
  const env = {
    ...process.env,
    ...(options.config.get('kbnTestServer.env') as Record<string, string | undefined>),
  };
  if (env.NO_COLOR !== undefined) {
    delete env.FORCE_COLOR;
  } else if (env.FORCE_COLOR === undefined) {
    env.FORCE_COLOR = '1';
  }

  const procRunnerOpts = {
    cwd: installDir || REPO_ROOT,
    cmd: installDir
      ? process.platform.startsWith('win')
        ? Path.resolve(installDir, 'bin/kibana.bat')
        : Path.resolve(installDir, 'bin/kibana')
      : process.execPath,
    env,
    ...(runOptions.wait !== undefined ? { wait: runOptions.wait } : {}),
    onEarlyExit: options.onEarlyExit,
  };

  const prefixArgs = devMode
    ? [Path.relative(procRunnerOpts.cwd, Path.resolve(REPO_ROOT, 'scripts/kibana'))]
    : [];

  if (options.inspect) {
    prefixArgs.unshift('--inspect');
  }

  const buildArgs: string[] = (config.get('kbnTestServer.buildArgs') as string[] | undefined) || [];
  const sourceArgs: string[] =
    (config.get('kbnTestServer.sourceArgs') as string[] | undefined) || [];
  const serverArgs: string[] =
    (config.get('kbnTestServer.serverArgs') as string[] | undefined) || [];

  let kbnFlags = parseRawFlags([
    // When installDir is passed, we run from a built version of Kibana which uses different command line
    // arguments. If installDir is not passed, we run from source code.
    ...(installDir ? [...buildArgs, ...serverArgs] : [...sourceArgs, ...serverArgs]),

    // We also allow passing in extra Kibana server options, tack those on here so they always take precedence
    ...(options.extraKbnOpts ?? []),
  ]);

  if (installDir) {
    kbnFlags = remapPluginPaths(kbnFlags, installDir);
  }

  const mainName = (useTaskRunner ? 'kbn-ui' : 'kibana') + (options.remote ? '-remote' : '');
  const promises = [
    // main process
    procs.run(mainName, {
      ...procRunnerOpts,
      writeLogsToPath: options.logsDir
        ? Path.resolve(options.logsDir, `${mainName}.log`)
        : undefined,
      args: [
        ...prefixArgs,
        ...parseRawFlags([
          ...kbnFlags,
          ...(!useTaskRunner
            ? []
            : [
                '--node.roles=["ui"]',
                `--path.data=${Path.resolve(Os.tmpdir(), `${uiPrefix}-ui-${uuidv4()}`)}`,
              ]),
        ]),
      ],
    }),
  ];

  if (useTaskRunner) {
    const mainUuid = getArgValue(kbnFlags, 'server.uuid');
    const tasksProcName = 'kbn-tasks' + (options.remote ? '-remote' : '');
    const kibanaPort = config.get('servers.kibana.port') as number;

    // dedicated task runner
    promises.push(
      procs.run(tasksProcName, {
        ...procRunnerOpts,
        writeLogsToPath: options.logsDir
          ? Path.resolve(options.logsDir, `${tasksProcName}.log`)
          : undefined,
        args: [
          ...prefixArgs,
          ...parseRawFlags([
            ...kbnFlags,
            `--server.port=${DedicatedTaskRunnerConfig.getPort(kibanaPort)}`,
            '--node.roles=["background_tasks"]',
            `--path.data=${Path.resolve(Os.tmpdir(), `${taskPrefix}-task-runner-${uuidv4()}`)}`,
            ...(typeof mainUuid === 'string' && mainUuid
              ? [`--server.uuid=${DedicatedTaskRunnerConfig.getUuid(mainUuid)}`]
              : []),
            ...(devMode ? ['--no-optimizer'] : []),
          ]),
        ],
      })
    );
  }

  await Promise.all(promises);
}
