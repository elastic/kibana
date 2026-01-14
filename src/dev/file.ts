/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, extname, join, relative, resolve, basename } from 'path';

export class File {
  public readonly path: string;
  private relativePath: string;
  private ext: string;
  private gitStatus: string;

  constructor(path: string, gitStatus: string = 'unknown') {
    this.path = resolve(path);
    this.relativePath = relative(process.cwd(), this.path);
    this.ext = extname(this.path);
    this.gitStatus = gitStatus;
  }

  public getAbsolutePath() {
    return this.path;
  }

  public getRelativePath() {
    return this.relativePath;
  }

  public getGitStatus() {
    return this.gitStatus;
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

  public isYaml() {
    return this.ext === '.yml' || this.ext === '.yaml';
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
