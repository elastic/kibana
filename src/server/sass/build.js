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

import path from 'path';
import { promisify } from 'util';
import fs from 'fs';
import sass from 'node-sass';
import minimatch from 'minimatch';

const renderSass = promisify(sass.render);
const writeFile = promisify(fs.writeFile);

export class Build {
  constructor(source, options = {}) {
    this.source = source;
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
  }

  outputPath() {
    const fileName = path.basename(this.source, path.extname(this.source)) + '.css';
    return path.join(path.dirname(this.source), fileName);
  }

  /**
   * Glob based on source path
   */

  getGlob() {
    return path.join(path.dirname(this.source), '**', '*.s{a,c}ss');
  }

  async buildIfInPath(path) {
    if (minimatch(path, this.getGlob())) {
      await this.build();
      return true;
    }

    return false;
  }

  /**
   * Transpiles SASS and writes CSS to output
   */

  async build() {
    try {
      const outFile = this.outputPath();

      const rendered = await renderSass({
        file: this.source,
        outFile,
        sourceMap: true,
        sourceMapEmbed: true,
        sourceComments: true,
      });

      await writeFile(outFile, rendered.css);

      this.onSuccess(this);
    } catch(e) {
      this.onError(this, e);
    }

    return this;
  }
}