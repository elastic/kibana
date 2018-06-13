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
import fs from 'fs';
import sass from 'node-sass';
import minimatch from 'minimatch';

export class SassBuilder {
  /**
   * @param {String} input - Full path to SASS file
   * @param {String} output - Full path to CSS to write to
   * @param {Object|null} options
   * @property {FSWatcher|null} options.watcher - Instance of Chokidar to use
   */

  constructor(input, options = {}) {
    this.input = input;
    this.watcher = options.watcher;
  }

  /**
   * Adds glob to instance of Watcher
   */

  addToWatcher() {
    if (!this.watcher) {
      return false;
    }

    this.watcher.add(this.getGlob());
  }

  outputPath() {
    const fileName = path.basename(this.input, path.extname(this.input)) + '.css';
    return path.join(path.dirname(this.input), fileName);
  }

  /**
   * Glob based on input path
   */

  getGlob() {
    return path.join(path.dirname(this.input), '**', '*.s{a,c}ss');
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
    const outFile = this.outputPath();

    const rendered = await sass.renderSync({
      file: this.input,
      outFile,
      sourceMap: true,
      sourceMapEmbed: true,
      sourceComments: true,
    });

    fs.writeFileSync(outFile, rendered.css);
  }
}