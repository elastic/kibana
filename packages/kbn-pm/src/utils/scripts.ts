/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { spawn, spawnStreaming } from './child_process';
import { Project } from './project';

const YARN_EXEC = process.env.npm_execpath || 'yarn';

interface WorkspaceInfo {
  location: string;
  workspaceDependencies: string[];
}

interface WorkspacesInfo {
  [s: string]: WorkspaceInfo;
}

/**
 * Install all dependencies in the given directory
 */
export async function installInDir(directory: string, extraArgs: string[] = []) {
  const options = ['install', '--non-interactive', ...extraArgs];

  // We pass the mutex flag to ensure only one instance of yarn runs at any
  // given time (e.g. to avoid conflicts).
  await spawn(YARN_EXEC, options, {
    cwd: directory,
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

export async function yarnWorkspacesInfo(directory: string): Promise<WorkspacesInfo> {
  const { stdout } = await spawn(YARN_EXEC, ['--json', 'workspaces', 'info'], {
    cwd: directory,
    stdio: 'pipe',
  });

  try {
    return JSON.parse(JSON.parse(stdout).data);
  } catch (error) {
    throw new Error(`'yarn workspaces info --json' produced unexpected output: \n${stdout}`);
  }
}
