import { dirname, extname, join, relative, resolve } from 'path';

import { REPO_ROOT } from './constants';

export class File {
  private path: string;
  private relativePath: string;
  private ext: string;

  constructor(path: string) {
    this.path = resolve(path);
    this.relativePath = relative(REPO_ROOT, this.path);
    this.ext = extname(this.path);
  }

  public getAbsolutePath() {
    return this.path;
  }

  public getRelativePath() {
    return this.relativePath;
  }

  public isJs() {
    return this.ext === '.js';
  }

  public isTypescript() {
    return this.ext === '.ts' || this.ext === '.tsx';
  }

  public getRelativeParentDirs() {
    const parents: string[] = [];

    while (true) {
      // NOTE: resolve() produces absolute paths, so we have to use join()
      const parent = parents.length
        ? join(parents[parents.length - 1], '..')
        : dirname(this.relativePath);

      if (parent === '..' || parent === '.') {
        break;
      } else {
        parents.push(parent);
      }
    }

    return parents;
  }

  public toString() {
    return this.relativePath;
  }

  public toJSON() {
    return this.relativePath;
  }
}
