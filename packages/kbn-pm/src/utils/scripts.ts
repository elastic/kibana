/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Agent from 'elastic-apm-node';
import { spawn, spawnStreaming } from './child_process';
import { Project } from './project';

const YARN_EXEC = process.env.npm_execpath || 'yarn';

/**
 * Install all dependencies in the given directory
 */
export async function installInDir(directory: string, extraArgs: string[] = []) {
  const options = ['install', '--non-interactive', ...extraArgs];
  const span = Agent.startSpan('yarn install', '@kbn/pm');

  // We pass the mutex flag to ensure only one instance of yarn runs at any
  // given time (e.g. to avoid conflicts).
  await spawn(YARN_EXEC, options, {
    cwd: directory,
  });

  if (span) span.end();
}

/**
 * Run script in the given directory
 */
export async function runScriptInPackage(script: string, args: string[], pkg: Project) {
  const span = Agent.startSpan(`[${pkg.name}] ${script}`, '@kbn/pm');
  const execOpts = {
    cwd: pkg.path,
  };

  await spawn(YARN_EXEC, ['run', script, ...args], execOpts);

  if (span) span.end();
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
  const span = Agent.startSpan(`[${pkg.name}] ${script}`, '@kbn/pm');
  const execOpts = {
    cwd: pkg.path,
  };

  const spawned = spawnStreaming(YARN_EXEC, ['run', script, ...args], execOpts, {
    prefix: pkg.name,
    debug,
  });

  spawned.on('close', (code) => {
    if (span) span.end();
  });

  return spawned;

  return spawned;
}
