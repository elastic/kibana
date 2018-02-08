import fs from 'fs';
import { promisify } from 'bluebird';

export const access = promisify(fs.access);
export const unlink = promisify(fs.unlink);
export const readFile = promisify(fs.readFile);
export const symlink = promisify(fs.symlink);

export async function exists(name) {
  try {
    await access(name);
    return true;
  } catch (e) {
    return false;
  }
}
