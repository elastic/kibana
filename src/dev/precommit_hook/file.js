import { resolve, dirname, relative, extname } from 'path';

import minimatch from 'minimatch';

export const ROOT = dirname(require.resolve('../../../package.json'));

export class File {
  constructor({ path, status }) {
    this._path = resolve(path);
    this._status = status;
  }

  getRelativePath() {
    return relative(ROOT, this._path);
  }

  isJs() {
    return extname(this._path) === '.js';
  }

  isDeleted() {
    return this._status === 'D';
  }

  matchesAnyGlob(globs) {
    return globs.some(pattern => minimatch(this.getRelativePath(), pattern, {
      dot: true
    }));
  }

  toString() {
    return this.getRelativePath();
  }
}
