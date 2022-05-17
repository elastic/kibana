/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ProcRunner } from '@kbn/dev-proc-runner';
import { resolve, relative } from 'path';
import { KIBANA_ROOT, KIBANA_EXEC, KIBANA_EXEC_PATH } from './paths';
import type { Config } from '../../functional_test_runner';

function extendNodeOptions(installDir?: string) {
  if (!installDir) {
    return {};
  }

  const testOnlyRegisterPath = relative(
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
  const env = config.get('kbnTestServer.env');

  await procs.run('kibana', {
    cmd: getKibanaCmd(installDir),
    args: filterCliArgs(collectCliArgs(config, installDir, options.extraKbnOpts)),
    env: {
      FORCE_COLOR: 1,
      ...process.env,
      ...env,
      ...extendNodeOptions(installDir),
    },
    cwd: installDir || KIBANA_ROOT,
    wait: runOptions.wait,
    onEarlyExit,
  });
}

function getKibanaCmd(installDir?: string) {
  if (installDir) {
    return process.platform.startsWith('win')
      ? resolve(installDir, 'bin/kibana.bat')
      : resolve(installDir, 'bin/kibana');
  }

  return KIBANA_EXEC;
}

/**
 * When installDir is passed, we run from a built version of Kibana,
 * which uses different command line arguments. If installDir is not
 * passed, we run from source code. We also allow passing in extra
 * Kibana server options, so we tack those on here.
 */
function collectCliArgs(config: Config, installDir?: string, extraKbnOpts: string[] = []) {
  const buildArgs: string[] = config.get('kbnTestServer.buildArgs') || [];
  const sourceArgs: string[] = config.get('kbnTestServer.sourceArgs') || [];
  const serverArgs: string[] = config.get('kbnTestServer.serverArgs') || [];

  return pipe(
    serverArgs,
    (args) => (installDir ? args.filter((a: string) => a !== '--oss') : args),
    (args) => (installDir ? [...buildArgs, ...args] : [KIBANA_EXEC_PATH, ...sourceArgs, ...args]),
    (args) => args.concat(extraKbnOpts)
  );
}

/**
 * Filter the cli args to remove duplications and
 * overridden options
 */
function filterCliArgs(args: string[]) {
  return args.reduce((acc, val, ind) => {
    // If original argv has a later basepath setting, skip this val.
    if (isBasePathSettingOverridden(args, val, ind)) {
      return acc;
    }

    // Check if original argv has a later setting that overrides
    // the current val. If so, skip this val.
    if (
      !allowsDuplicate(val) &&
      findIndexFrom(args, ++ind, (opt) => opt.split('=')[0] === val.split('=')[0]) > -1
    ) {
      return acc;
    }

    return [...acc, val];
  }, [] as string[]);
}

/**
 * Apply each function in fns to the result of the
 * previous function. The first function's input
 * is the arr array.
 */
function pipe(arr: any[], ...fns: Array<(...args: any[]) => any>) {
  return fns.reduce((acc, fn) => {
    return fn(acc);
  }, arr);
}

/**
 * Checks whether a specific parameter is allowed to appear multiple
 * times in the Kibana parameters.
 */
function allowsDuplicate(val: string) {
  return ['--plugin-path'].includes(val.split('=')[0]);
}

function isBasePathSettingOverridden(args: string[], val: string, index: number) {
  const key = val.split('=')[0];
  const basePathKeys = ['--no-base-path', '--server.basePath'];

  if (basePathKeys.includes(key)) {
    if (findIndexFrom(args, ++index, (opt) => basePathKeys.includes(opt.split('=')[0])) > -1) {
      return true;
    }
  }

  return false;
}

function findIndexFrom(array: string[], index: number, predicate: (element: string) => boolean) {
  return [...array].slice(index).findIndex(predicate);
}
