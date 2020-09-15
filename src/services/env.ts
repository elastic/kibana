import { homedir } from 'os';
import path from 'path';
import { ValidConfigOptions } from '../options/options';

export function getLogfilePath() {
  return path.join(homedir(), '.backport', 'backport.log');
}

export function getGlobalConfigPath() {
  return path.join(homedir(), '.backport', 'config.json');
}

export function getReposPath() {
  return path.join(homedir(), '.backport', 'repositories');
}

export function getRepoOwnerPath({ repoOwner }: ValidConfigOptions) {
  return path.join(homedir(), '.backport', 'repositories', repoOwner);
}

export function getRepoPath({ repoOwner, repoName }: ValidConfigOptions) {
  return path.join(homedir(), '.backport', 'repositories', repoOwner, repoName);
}
