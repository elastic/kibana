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

  getRelativeParentDirs() {
    const parents = [];

    while (true) {
      const parent = parents.length
        // NOTE: resolve() produces absolute paths, so we have to use join()
        ? join(parents[parents.length - 1], '..')
        : dirname(this._relativePath);

      if (parent === '..' || parent === '.') {
        break;
      } else {
        parents.push(parent);
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
