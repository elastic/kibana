import { promisify } from 'util';
import { exec as execOriginal } from 'child_process';
import fs from 'fs';
import mkdirpOriginal from 'mkdirp';

const execAsPromised = promisify(execOriginal);
const mkdirpAsPromised = promisify(mkdirpOriginal);

export function exec(cmd: string, options?: {}) {
  return execAsPromised(cmd, { maxBuffer: 100 * 1024 * 1024, ...options });
}
export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);
export const stat = promisify(fs.stat);
export const chmod = promisify(fs.chmod);
export const mkdirp = (path: string) => mkdirpAsPromised(path);
