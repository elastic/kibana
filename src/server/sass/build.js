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
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssUrl from 'postcss-url';
import mkdirp from 'mkdirp';
import isPathInside from 'is-path-inside';

const renderSass = promisify(sass.render);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const copyFile = promisify(fs.copyFile);
const mkdirpAsync = promisify(mkdirp);

const DARK_THEME_IMPORTER = (url) => {
  if (url.includes('k6_colors_light')) {
    return { file: url.replace('k6_colors_light', 'k6_colors_dark') };
  }

  return { file: url };
};

export class Build {
  constructor({ log, sourcePath, targetPath, urlImports, theme }) {
    this.log = log;
    this.sourcePath = sourcePath;
    this.targetPath = targetPath;
    this.urlImports = urlImports;
    this.theme = theme;
    this.includedFiles = [sourcePath];
  }

  /**
   * Glob based on source path
   */
  async buildIfIncluded(path) {
    if (this.includedFiles && this.includedFiles.includes(path)) {
      await this.build();
      return true;
    }

    return false;
  }

  /**
   * Transpiles SASS and writes CSS to output
   */

  async build() {
    const rendered = await renderSass({
      file: this.sourcePath,
      outFile: this.targetPath,
      sourceMap: true,
      sourceMapEmbed: true,
      includePaths: [
        path.resolve(__dirname, '../..'),
        path.resolve(__dirname, '../../../node_modules'),
      ],
      importer: this.theme === 'dark' ? DARK_THEME_IMPORTER : undefined
    });

    const sourceBaseDir = path.dirname(this.sourcePath);
    const targetDir = path.dirname(this.targetPath);
    const processor = postcss([ autoprefixer ]);

    const urlAssets = [];

    if (this.urlImports) {
      const { publicDir, urlBase } = this.urlImports;
      processor.use(postcssUrl({
        url: (asset) => {
          if (!asset.pathname) {
            return asset.url;
          }

          const sourcePath = path.resolve(sourceBaseDir, asset.pathname);
          if (!isPathInside(sourcePath, publicDir)) {
            throw new Error(`Unable to use url("${asset.url}"), it must resolve to a file within "${publicDir}"`);
          }

          const urlAsset = {
            url: asset.url,
            from: sourcePath,
            to: path.resolve(targetDir, asset.pathname),
          };

          if (!urlAssets.some(({ from, to }) => from === urlAsset.from && to === urlAsset.to)) {
            urlAssets.push(urlAsset);
          }

          return `${urlBase}/${path.relative(publicDir, sourcePath)}`.replace(/\\/g, '/');
        }
      }));
    }

    const prefixed = await processor.process(rendered.css, {
      from: this.sourcePath
    });

    this.includedFiles = [
      ...rendered.stats.includedFiles,
      ...urlAssets.map(({ from }) => from),
    ];

    // verify that source files exist before writing anything
    await Promise.all(urlAssets.map(async ({ url, from }) => {
      if (!await exists(from)) {
        throw new Error(`Unable to locate url("${url}"), it must resolve to a file relative to "${sourceBaseDir}"`);
      }
    }));

    // write css
    await mkdirpAsync(targetDir);
    await writeFile(this.targetPath, prefixed.css);

    // copy urlAssets
    await Promise.all(urlAssets.map(async ({ from, to }) => {
      await mkdirpAsync(path.dirname(to));
      await copyFile(from, to);
    }));

    return this;
  }
}
