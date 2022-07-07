/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import type { ProcRunner } from '@kbn/dev-proc-runner';

import { KIBANA_ROOT, KIBANA_EXEC, KIBANA_SCRIPT_PATH } from './paths';
import type { Config } from '../../functional_test_runner';
import { getCliArgs } from './kibana_cli_args';

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
  const extraArgs = options.extraKbnOpts ?? [];

  const cmd = getKibanaCmd(installDir);
  const mainArgs = getCliArgs(config, installDir, extraArgs);

  const env = {
    FORCE_COLOR: 1,
    ...process.env,
    ...config.get('kbnTestServer.env'),
    ...extendNodeOptions(installDir),
  };
  const cwd = installDir || KIBANA_ROOT;
  const wait = runOptions.wait;

  const promises = [
    // main process
    procs.run('kibana', {
      cmd,
      args: installDir ? mainArgs : [KIBANA_SCRIPT_PATH, ...mainArgs],
      env,
      cwd,
      wait,
      onEarlyExit,
    }),
  ];

  await Promise.all(promises);
}

function getKibanaCmd(installDir?: string) {
  if (installDir) {
    return process.platform.startsWith('win')
      ? Path.resolve(installDir, 'bin/kibana.bat')
      : Path.resolve(installDir, 'bin/kibana');
  }

  return KIBANA_EXEC;
}
