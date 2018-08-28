import path from 'path';
import os from 'os';

export function getGlobalConfigPath() {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'config.json');
}

export function getReposPath() {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories');
}

export function getRepoOwnerPath(owner: string) {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', owner);
}

export function getRepoPath(owner: string, repoName: string) {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', owner, repoName);
}
