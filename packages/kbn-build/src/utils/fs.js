import fs from 'fs';
import promisify from 'pify';

const stat = promisify(fs.stat);

export async function isDirectory(path) {
  try {
    const targetFolder = await stat(path);
    return targetFolder.isDirectory();
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}
