import { homedir } from 'os';
import path from 'path';
import { ValidConfigOptions } from '../options/options';

export function getBackportDirPath() {
  return path.join(homedir(), '.backport');
}

export function getLogfilePath({ logFilePath }: { logFilePath?: string }) {
  if (logFilePath) {
    return path.resolve(logFilePath);
  }
  return path.join(homedir(), '.backport', 'backport.log');
}

export function getGlobalConfigPath() {
  return path.join(homedir(), '.backport', 'config.json');
}

export function getRepoPath({ repoOwner, repoName, dir }: ValidConfigOptions) {
  if (dir) {
    return dir;
  }

  return path.join(homedir(), '.backport', 'repositories', repoOwner, repoName);
}
