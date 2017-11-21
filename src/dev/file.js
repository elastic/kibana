import { dirname, join, resolve, relative, extname } from 'path';

import { REPO_ROOT } from './constants';

export class File {
  constructor(path) {
    this._path = resolve(path);
    this._relativePath = relative(REPO_ROOT, this._path);
    this._ext = extname(this._path);
  }

  getRelativePath() {
    return this._relativePath;
  }

  isJs() {
    return this._ext === '.js';
  }

  getParentDirs() {
    const parent = dirname(this._relativePath);
    if (parent === '.') {
      return [];
    }

    const parents = [parent];
    while (true) {
      // NOTE: resolve() produces absolute paths, so we have to use join()
      const parentOfParent = join(parents[parents.length - 1], '..');
      if (parentOfParent === '..' || parentOfParent === '.') {
        break;
      } else {
        parents.push(parentOfParent);
      }
    }
    return parents;
  }

  toString() {
    return this._relativePath;
  }

  toJSON() {
    return this._relativePath;
  }
}
