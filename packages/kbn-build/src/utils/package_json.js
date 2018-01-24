import readPkg from 'read-pkg';
import path from 'path';

export function readPackageJson(dir) {
  return readPkg(path.join(dir, 'package.json'), { normalize: false });
}
