import { promisify } from 'util';
import { exec as execLegacy } from 'child_process';
import fs from 'fs';
import mkdirpLegacy from 'mkdirp';

const execAsPromised = promisify(execLegacy);
const mkdirpAsPromised = promisify(mkdirpLegacy);

export function exec(cmd: string, options?: {}) {
  return execAsPromised(cmd, { maxBuffer: 100 * 1024 * 1024, ...options });
}
export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);
export const stat = promisify(fs.stat);
export const chmod = promisify(fs.chmod);
export const statSync = fs.statSync;
export const mkdirp = (path: string) => mkdirpAsPromised(path);
