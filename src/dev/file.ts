/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { dirname, extname, join, relative, resolve, sep } from 'path';

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
    return (
      this.relativePath.split(sep).includes('__fixtures__') || this.path.endsWith('.test-d.ts')
    );
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
