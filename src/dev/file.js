import { resolve, relative, extname } from 'path';

import minimatch from 'minimatch';

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

  matchesRegex(regex) {
    return this._relativePath.match(regex);
  }

  matchesAnyGlob(globs) {
    return globs.some(pattern => minimatch(this._relativePath, pattern, {
      dot: true
    }));
  }

  toString() {
    return this._relativePath;
  }

  toJSON() {
    return this._relativePath;
  }
}
