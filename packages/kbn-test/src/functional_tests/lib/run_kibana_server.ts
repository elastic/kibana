/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Os from 'os';

import Uuid from 'uuid';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/utils';

import type { Config } from '../../functional_test_runner';
import { DedicatedTaskRunner } from '../../functional_test_runner/lib';
import { parseRawFlags, getArgValue } from './kibana_cli_args';

function extendNodeOptions(installDir?: string) {
  if (!installDir) {
    return {};
  }

  const testOnlyRegisterPath = Path.relative(
    installDir,
    require.resolve('./babel_register_for_test_plugins')
  );

  return {
    NODE_OPTIONS: `--require=${testOnlyRegisterPath}${
      process.env.NODE_OPTIONS ? ` ${process.env.NODE_OPTIONS}` : ''
    }`,
  };
}

export async function runKibanaServer({
  procs,
  config,
  options,
  onEarlyExit,
}: {
  procs: ProcRunner;
  config: Config;
  options: { installDir?: string; extraKbnOpts?: string[] };
  onEarlyExit?: (msg: string) => void;
}) {
  const runOptions = config.get('kbnTestServer.runOptions');
  const installDir = runOptions.alwaysUseSource ? undefined : options.installDir;
  const devMode = !installDir;
  const useTaskRunner = config.get('kbnTestServer.useDedicatedTaskRunner');

  const procRunnerOpts = {
    cwd: installDir || REPO_ROOT,
    cmd: installDir
      ? process.platform.startsWith('win')
        ? Path.resolve(installDir, 'bin/kibana.bat')
        : Path.resolve(installDir, 'bin/kibana')
      : process.execPath,
    env: {
      FORCE_COLOR: 1,
      ...process.env,
      ...config.get('kbnTestServer.env'),
      ...extendNodeOptions(installDir),
    },
    wait: runOptions.wait,
    onEarlyExit,
  };

  const prefixArgs = devMode
    ? [Path.relative(process.cwd(), Path.resolve(REPO_ROOT, 'scripts/kibana'))]
    : [];

  const buildArgs: string[] = config.get('kbnTestServer.buildArgs') || [];
  const sourceArgs: string[] = config.get('kbnTestServer.sourceArgs') || [];
  const serverArgs: string[] = config.get('kbnTestServer.serverArgs') || [];

  const kbnFlags = parseRawFlags([
    // When installDir is passed, we run from a built version of Kibana which uses different command line
    // arguments. If installDir is not passed, we run from source code.
    ...(installDir
      ? [...buildArgs, ...serverArgs.filter((a: string) => a !== '--oss')]
      : [...sourceArgs, ...serverArgs]),

    // We also allow passing in extra Kibana server options, tack those on here so they always take precedence
    ...(options.extraKbnOpts ?? []),
  ]);

  const promises = [
    // main process
    procs.run(useTaskRunner ? 'kbn-ui' : 'kibana', {
      ...procRunnerOpts,
      args: [
        ...prefixArgs,
        ...parseRawFlags([
          ...kbnFlags,
          ...(!useTaskRunner
            ? []
            : [
                '--node.roles=["ui"]',
                `--path.data=${Path.resolve(Os.tmpdir(), `ftr-ui-${Uuid.v4()}`)}`,
              ]),
        ]),
      ],
    }),
  ];

  if (useTaskRunner) {
    const mainUuid = getArgValue(kbnFlags, 'server.uuid');

    // dedicated task runner
    procs.run('kbn-tasks', {
      ...procRunnerOpts,
      args: [
        ...prefixArgs,
        ...parseRawFlags([
          ...kbnFlags,
          `--server.port=${DedicatedTaskRunner.getPort(config.get('servers.kibana.port'))}`,
          '--node.roles=["background_tasks"]',
          `--path.data=${Path.resolve(Os.tmpdir(), `ftr-task-runner-${Uuid.v4()}`)}`,
          ...(typeof mainUuid === 'string' && mainUuid
            ? [`--server.uuid=${DedicatedTaskRunner.getUuid(mainUuid)}`]
            : []),
          ...(devMode ? ['--no-optimizer'] : []),
        ]),
      ],
    });
  }

  await Promise.all(promises);
}
