/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spawn, spawnStreaming } from './child_process';
import { Project } from './project';

const YARN_EXEC = process.env.npm_execpath || 'yarn';

/**
 * Install all dependencies in the given directory
 */
export async function installInDir(directory: string, extraArgs: string[] = []) {
  const options = ['install', '--non-interactive', ...extraArgs];

  // We pass the mutex flag to ensure only one instance of yarn runs at any
  // given time (e.g. to avoid conflicts).
  await spawn(YARN_EXEC, options, {
    cwd: directory,
    env: {
      SASS_BINARY_SITE:
        'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-sass',
      RE2_DOWNLOAD_MIRROR:
        'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2',
    },
  });
}

/**
 * Run script in the given directory
 */
export async function runScriptInPackage(script: string, args: string[], pkg: Project) {
  const execOpts = {
    cwd: pkg.path,
  };

  await spawn(YARN_EXEC, ['run', script, ...args], execOpts);
}

/**
 * Run script in the given directory
 */
export function runScriptInPackageStreaming({
  script,
  args,
  pkg,
  debug,
}: {
  script: string;
  args: string[];
  pkg: Project;
  debug?: boolean;
}) {
  const execOpts = {
    cwd: pkg.path,
  };

  return spawnStreaming(YARN_EXEC, ['run', script, ...args], execOpts, {
    prefix: pkg.name,
    debug,
  });
}
