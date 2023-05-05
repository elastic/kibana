/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Os from 'os';

import { v4 as uuidv4 } from 'uuid';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/repo-info';

import { execSync } from 'child_process';
import type { Config } from '../../functional_test_runner';
import { DedicatedTaskRunner } from '../../functional_test_runner/lib';
import { parseRawFlags, getArgValue, remapPluginPaths } from './kibana_cli_args';

export async function runKibanaServer(options: {
  procs: ProcRunner;
  config: Config;
  installDir?: string;
  extraKbnOpts?: string[];
  logsDir?: string;
  onEarlyExit?: (msg: string) => void;
}) {
  const showMeTheArgMax = () => execSync(`getconf ARG_MAX`).toString();
  try {
    const argMax = showMeTheArgMax();
    // eslint-disable-next-line no-console
    console.log(`\n### argMax: \n\t${argMax}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`\n !!! Failed trying for ARG_MAX: ${e}`);
  }
  const { config, procs } = options;
  const runOptions = options.config.get('kbnTestServer.runOptions');
  const installDir = runOptions.alwaysUseSource ? undefined : options.installDir;
  const devMode = !installDir;
  const useTaskRunner = options.config.get('kbnTestServer.useDedicatedTaskRunner');

  const cmd = installDir
    ? process.platform.startsWith('win')
      ? Path.resolve(installDir, 'bin/kibana.bat')
      : Path.resolve(installDir, 'bin/kibana')
    : process.execPath;

  // eslint-disable-next-line no-console
  console.log(`\n### cmd: \n\t${cmd}`);

  const procRunnerOpts = {
    cwd: installDir || REPO_ROOT,
    cmd,
    env: {
      FORCE_COLOR: 1,
      ...process.env,
      ...options.config.get('kbnTestServer.env'),
    },
    wait: runOptions.wait,
    onEarlyExit: options.onEarlyExit,
  };

  const prefixArgs = devMode
    ? [Path.relative(procRunnerOpts.cwd, Path.resolve(REPO_ROOT, 'scripts/kibana'))]
    : [];

  const buildArgs: string[] = config.get('kbnTestServer.buildArgs') || [];
  const sourceArgs: string[] = config.get('kbnTestServer.sourceArgs') || [];
  const serverArgs: string[] = config.get('kbnTestServer.serverArgs') || [];

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

  const args = [
    ...prefixArgs,
    ...parseRawFlags([
      ...kbnFlags,
      ...(!useTaskRunner
        ? []
        : [
            '--node.roles=["ui"]',
            `--path.data=${Path.resolve(Os.tmpdir(), `ftr-ui-${uuidv4()}`)}`,
          ]),
    ]),
  ];
  // eslint-disable-next-line no-console
  console.log(`\n### args: \n${JSON.stringify(args, null, 2)}`);
  // eslint-disable-next-line no-console
  console.log(`\n### arg flattened length: \n\t${args.join(' ').length}`);
  const mainName = useTaskRunner ? 'kbn-ui' : 'kibana';
  const promises = [
    // main process
    procs.run(mainName, {
      ...procRunnerOpts,
      writeLogsToPath: options.logsDir
        ? Path.resolve(options.logsDir, `${mainName}.log`)
        : undefined,
      args,
    }),
  ];

  if (useTaskRunner) {
    const mainUuid = getArgValue(kbnFlags, 'server.uuid');

    const argsTaskRunner = [
      ...prefixArgs,
      ...parseRawFlags([
        ...kbnFlags,
        `--server.port=${DedicatedTaskRunner.getPort(config.get('servers.kibana.port'))}`,
        '--node.roles=["background_tasks"]',
        `--path.data=${Path.resolve(Os.tmpdir(), `ftr-task-runner-${uuidv4()}`)}`,
        ...(typeof mainUuid === 'string' && mainUuid
          ? [`--server.uuid=${DedicatedTaskRunner.getUuid(mainUuid)}`]
          : []),
        ...(devMode ? ['--no-optimizer'] : []),
      ]),
    ];
    // eslint-disable-next-line no-console
    console.log(`\n### argsTaskRunner: \n${JSON.stringify(argsTaskRunner, null, 2)}`);
    // eslint-disable-next-line no-console
    console.log(`\n### argsTaskRunner flattened length: \n\t${argsTaskRunner.join(' ').length}`);
    // dedicated task runner
    promises.push(
      procs.run('kbn-tasks', {
        ...procRunnerOpts,
        writeLogsToPath: options.logsDir
          ? Path.resolve(options.logsDir, 'kbn-tasks.log')
          : undefined,
        args,
      })
    );
  }

  function flatten(x: string) {
    return;
  }

  await Promise.all(promises);
}
