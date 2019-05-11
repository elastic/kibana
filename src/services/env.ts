import path from 'path';
import os from 'os';
import { BackportOptions } from '../options/options';

export function getGlobalConfigPath() {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'config.json');
}

export function getReposPath() {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories');
}

export function getRepoOwnerPath({ repoOwner }: BackportOptions) {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', repoOwner);
}

export function getRepoPath({ repoOwner, repoName }: BackportOptions) {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', repoOwner, repoName);
}
