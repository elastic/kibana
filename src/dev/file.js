import { resolve, relative, extname } from 'path';

import minimatch from 'minimatch';

import { REPO_ROOT } from './constants';

export class File {
  constructor(path) {
    this._path = resolve(path);
  }

  getRelativePath() {
    return relative(REPO_ROOT, this._path);
  }

  isJs() {
    return extname(this._path) === '.js';
  }

  matchesRegex(regex) {
    return this.getRelativePath().match(regex);
  }

  matchesAnyGlob(globs) {
    return globs.some(pattern => minimatch(this.getRelativePath(), pattern, {
      dot: true
    }));
  }

  toString() {
    return this.getRelativePath();
  }

  toJSON() {
    return this.getRelativePath();
  }
}
