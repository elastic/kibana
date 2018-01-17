import { spawn, spawnStreaming } from './child_process';

/**
 * Install all dependencies in the given directory
 */
export function installInDir(directory, extraArgs = []) {
  const options = [
    'install',
    '--non-interactive',
    '--mutex file',
    ...extraArgs
  ];

  // We pass the mutex flag to ensure only one instance of yarn runs at any
  // given time (e.g. to avoid conflicts).
  return spawn('yarn', options, {
    cwd: directory
  });
}

/**
 * Run script in the given directory
 */
export function runScriptInPackageStreaming(script, args, pkg) {
  const execOpts = {
    cwd: pkg.path
  };

  return spawnStreaming('yarn', ['run', script, ...args], execOpts, {
    prefix: pkg.name
  });
}
