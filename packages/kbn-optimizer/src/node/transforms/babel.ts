/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import * as babel from '@babel/core';

import { Transform } from './transform';

export function getBabelOptions(path: string) {
  return babel.loadOptions({
    cwd: process.cwd(),
    sourceRoot: Path.dirname(path) + Path.sep,
    filename: path,
    babelrc: false,
    presets: [require.resolve('@kbn/babel-preset/node_preset')],
    sourceMaps: 'both',
    ast: false,
  })!;
}

export const babelTransform: Transform = (path, source, cache) => {
  const mtime = `${Fs.statSync(path).mtimeMs}`;

  if (cache.getMtime(path) === mtime) {
    const code = cache.getCode(path);
    if (code) {
      return code;
    }
  }

  const options = getBabelOptions(path);
  const result = babel.transform(source, options);

  if (!result || !result.code || !result.map) {
    throw new Error(`babel failed to transpile [${path}]`);
  }

  cache.update(path, {
    mtime,
    code: result.code,
    map: result.map,
  });

  return result.code;
};
