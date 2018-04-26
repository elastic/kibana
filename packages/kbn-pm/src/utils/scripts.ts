import { spawn, spawnStreaming } from './child_process';
import { Project } from './project';

/**
 * Install all dependencies in the given directory
 */
export async function installInDir(
  directory: string,
  extraArgs: string[] = []
) {
  const options = [
    'install',
    '--non-interactive',
    '--mutex file',
    ...extraArgs,
  ];

  // We pass the mutex flag to ensure only one instance of yarn runs at any
  // given time (e.g. to avoid conflicts).
  await spawn('yarn', options, {
    cwd: directory,
  });
}

/**
 * Run script in the given directory
 */
export async function runScriptInPackage(
  script: string,
  args: string[],
  pkg: Project
) {
  const execOpts = {
    cwd: pkg.path,
  };

  await spawn('yarn', ['run', script, ...args], execOpts);
}

/**
 * Run script in the given directory
 */
export function runScriptInPackageStreaming(
  script: string,
  args: string[],
  pkg: Project
) {
  const execOpts = {
    cwd: pkg.path,
  };

  return spawnStreaming('yarn', ['run', script, ...args], execOpts, {
    prefix: pkg.name,
  });
}
