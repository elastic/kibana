import { spawn, spawnStreaming } from './child_process';
import { yarnPath } from '../paths';

/**
 * Install all dependencies in the given directory
 */
export function installInDir(directory, extraArgs = []) {
  const options = [
    'install',
    '--non-interactive',
    '--mutex file',
    ...extraArgs,
  ];

  // We pass the mutex flag to ensure only one instance of yarn runs at any
  // given time (e.g. to avoid conflicts).
  return spawn(yarnPath, options, {
    cwd: directory,
  });
}

/**
 * Run script in the given directory
 */
export function runScriptInPackage(script, args, pkg) {
  const execOpts = {
    cwd: pkg.path,
  };

  return spawn(yarnPath, ['run', script, ...args], execOpts);
}

/**
 * Run script in the given directory
 */
export function runScriptInPackageStreaming(script, args, pkg) {
  const execOpts = {
    cwd: pkg.path,
  };

  return spawnStreaming(yarnPath, ['run', script, ...args], execOpts, {
    prefix: pkg.name,
  });
}
