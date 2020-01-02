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

import { resolve, relative, dirname, join } from 'path';
import { promisify } from 'util';
import fs from 'fs';
import sass from 'node-sass';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssUrl from 'postcss-url';
import chalk from 'chalk';
import isPathInside from 'is-path-inside';
import { PUBLIC_PATH_PLACEHOLDER } from '../../../optimize/public_path_placeholder';

const renderSass = promisify(sass.render);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const copyFile = promisify(fs.copyFile);
const mkdirAsync = promisify(fs.mkdir);

const UI_ASSETS_DIR = resolve(__dirname, '../../ui/public/assets');
const DARK_THEME_IMPORTER = (url) => {
  if (url.includes('eui_colors_light')) {
    return { file: url.replace('eui_colors_light', 'eui_colors_dark') };
  }

  return { file: url };
};

const makeAsset = (request, { path, root, boundry, copyRoot, urlRoot }) => {
  const relativePath = relative(root, path);
  return {
    path,
    root,
    boundry,
    url: join(`${PUBLIC_PATH_PLACEHOLDER}${urlRoot}`, relativePath).replace(/\\/g, '/'),
    copyTo: copyRoot ? resolve(copyRoot, relativePath) : undefined,
    requestUrl: request.url,
  };
};

export class Build {
  constructor({ log, sourcePath, targetPath, urlImports, theme, sourceMap  = true, outputStyle = 'nested' }) {
    this.log = log;
    this.sourcePath = sourcePath;
    this.sourceDir = dirname(this.sourcePath);
    this.targetPath = targetPath;
    this.targetDir = dirname(this.targetPath);
    this.urlImports = urlImports;
    this.theme = theme;
    this.includedFiles = [sourcePath];
    this.sourceMap = sourceMap;
    this.outputStyle = outputStyle;
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
      sourceMap: this.sourceMap,
      outputStyle: this.outputStyle,
      sourceMapEmbed: this.sourceMap,
      includePaths: [
        resolve(__dirname, '../../../../node_modules'),
      ],
      importer: this.theme === 'dark' ? DARK_THEME_IMPORTER : undefined
    });

    const processor = postcss([ autoprefixer ]);

    const urlAssets = [];

    if (this.urlImports) {
      processor.use(postcssUrl({
        url: (request) => {
          if (!request.pathname) {
            return request.url;
          }

          const asset = makeAsset(request, (
            request.pathname.startsWith('ui/assets')
              ? {
                path: resolve(UI_ASSETS_DIR, relative('ui/assets', request.pathname)),
                root: UI_ASSETS_DIR,
                boundry: UI_ASSETS_DIR,
                urlRoot: `ui/`,
              }
              : {
                path: resolve(this.sourceDir, request.pathname),
                root: this.sourceDir,
                boundry: this.urlImports.publicDir,
                urlRoot: this.urlImports.urlBase,
                copyRoot: this.targetDir,
              }
          ));

          if (!urlAssets.some(({ path, copyTo }) => path === asset.path && copyTo === asset.copyTo)) {
            urlAssets.push(asset);
          }

          return asset.url;
        }
      }));
    }

    const prefixed = await processor.process(rendered.css, {
      from: this.sourcePath
    });

    this.includedFiles = [
      ...rendered.stats.includedFiles,
      ...urlAssets.map(({ path }) => path),
    ];

    // verify that asset sources exist and import is valid before writing anything
    await Promise.all(
      urlAssets.map(async asset => {
        try {
          await access(asset.path);
        } catch (e) {
          throw this._makeError(
            'Invalid url() in css output',
            `url("${asset.requestUrl}") resolves to "${asset.path}", which does not exist.\n` +
              `  Make sure that the request is relative to "${asset.root}"`
          );
        }

        if (!isPathInside(asset.path, asset.boundry)) {
          throw this._makeError(
            'Invalid url() in css output',
            `url("${asset.requestUrl}") resolves to "${asset.path}"\n` +
              `  which is outside of "${asset.boundry}"`
          );
        }
      })
    );

    // write css
    await mkdirAsync(this.targetDir, { recursive: true });
    await writeFile(this.targetPath, prefixed.css);

    // copy non-shared urlAssets
    await Promise.all(urlAssets.map(async (asset) => {
      if (!asset.copyTo) {
        return;
      }

      await mkdirAsync(dirname(asset.copyTo), { recursive: true });
      await copyFile(asset.path, asset.copyTo);
    }));

    return this;
  }

  _makeError(title, message) {
    const error = new Error(`${chalk.red(`${title} [${this.sourcePath}]`)}\n\n  ${message}\n`);
    error.file = this.sourcePath;
    return error;
  }
}
