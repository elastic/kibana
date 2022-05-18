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
