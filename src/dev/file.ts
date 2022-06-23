/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname, extname, join, relative, resolve, sep, basename } from 'path';

export class File {
  private path: string;
  private relativePath: string;
  private ext: string;

  constructor(path: string) {
    this.path = resolve(path);
    this.relativePath = relative(process.cwd(), this.path);
    this.ext = extname(this.path);
  }

  public getAbsolutePath() {
    return this.path;
  }

  public getRelativePath() {
    return this.relativePath;
  }

  public getWithoutExtension() {
    const directory = dirname(this.path);
    const stem = basename(this.path, this.ext);
    return new File(resolve(directory, stem));
  }

  public isJs() {
    return this.ext === '.js';
  }

  public isTypescript() {
    return this.ext === '.ts' || this.ext === '.tsx';
  }

  public isTypescriptAmbient() {
    return this.path.endsWith('.d.ts');
  }

  public isSass() {
    return this.ext === '.sass' || this.ext === '.scss';
  }

  public isFixture() {
    const parts = this.relativePath.split(sep);
    if (parts.includes('__fixtures__') || this.path.endsWith('.test-d.ts')) {
      return true;
    }

    const i = parts.indexOf('kbn-generate');
    if (i >= 0 && parts[i + 1] === 'templates') {
      return true;
    }

    return false;
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
