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
import { existsSync } from 'fs';
import { flatConcatAtType } from './reduce';
import { mapSpec, wrap } from './modify_reduce';

const OK_EXTNAMES = ['.css', '.scss'];

function getUrlBase(pluginSpec) {
  return `plugins/${pluginSpec.getId()}`;
}

function getPublicPath(pluginSpec, localPath) {
  // get the path of the stylesheet relative to the public dir for the plugin
  let relativePath = path.relative(pluginSpec.getPublicDir(), localPath);

  // replace back slashes on windows
  relativePath = relativePath.split('\\').join('/');

  return `${getUrlBase(pluginSpec)}/${relativePath}`;
}

function getStyleSheetPath(pluginSpec, localPath, theme) {
  const extname = path.extname(localPath);
  const localCssPath = localPath.slice(0, -extname.length) + `.${theme}.css`;

  return {
    theme,
    localPath: existsSync(localCssPath) ? localCssPath : localPath,
    publicPath: getPublicPath(pluginSpec, localCssPath),
    urlImports: {
      urlBase: `built_assets/css/${getUrlBase(pluginSpec)}`,
      publicDir: pluginSpec.getPublicDir(),
    },
  };
}

function normalize(localPath, type, pluginSpec) {
  const pluginId = pluginSpec.getId();
  const publicDir = path.normalize(pluginSpec.getPublicDir());
  const extname = path.extname(localPath);

  if (!OK_EXTNAMES.includes(extname)) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.styleSheetPaths supported extensions [${OK_EXTNAMES.join(
        ', '
      )}], got "${extname}"`
    );
  }

  if (!path.isAbsolute(localPath)) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.styleSheetPaths must be an absolute path, got "${localPath}"`
    );
  }

  if (!path.normalize(localPath).startsWith(publicDir)) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.styleSheetPaths must be child of publicDir [${publicDir}]`
    );
  }

  if (extname === '.css') {
    // when the localPath points to a css file, assume it will be included in every theme
    // and don't create ligkt/dark variations of it
    return {
      theme: '*',
      localPath: localPath,
      publicPath: getPublicPath(pluginSpec, localPath),
    };
  }

  return [
    getStyleSheetPath(pluginSpec, localPath, 'light'),
    getStyleSheetPath(pluginSpec, localPath, 'dark'),
  ];
}

export const styleSheetPaths = wrap(mapSpec(normalize), flatConcatAtType);
