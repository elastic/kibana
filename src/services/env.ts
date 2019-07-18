import { homedir } from 'os';
import path from 'path';
import { BackportOptions } from '../options/options';

export function getGlobalConfigPath() {
  return path.join(homedir(), '.backport', 'config.json');
}

export function getReposPath() {
  return path.join(homedir(), '.backport', 'repositories');
}

export function getRepoOwnerPath({ repoOwner }: BackportOptions) {
  return path.join(homedir(), '.backport', 'repositories', repoOwner);
}

export function getRepoPath({ repoOwner, repoName }: BackportOptions) {
  return path.join(homedir(), '.backport', 'repositories', repoOwner, repoName);
}
