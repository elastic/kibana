/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import File from 'vinyl';
import * as Babel from '@babel/core';

const transformedFiles = new WeakSet<File>();

/**
 * Returns a promise that resolves when the file has been
 * mutated so the contents of the file are tranformed with
 * babel, include inline sourcemaps, and the filename has
 * been updated to use .js.
 *
 * If the file was previously transformed with this function
 * the promise will just resolve immediately.
 */
export async function transformFileWithBabel(file: File) {
  if (!(file.contents instanceof Buffer)) {
    throw new Error('file must be buffered');
  }

  if (transformedFiles.has(file)) {
    return;
  }

  const source = file.contents.toString('utf8');
  const result = await Babel.transformAsync(source, {
    babelrc: false,
    configFile: false,
    sourceMaps: 'inline',
    filename: file.path,
    presets: [require.resolve('@kbn/babel-preset/node_preset')],
  });

  if (!result || typeof result.code !== 'string') {
    throw new Error('babel transformation failed without an error...');
  }

  file.contents = Buffer.from(result.code);
  file.extname = '.js';
  transformedFiles.add(file);
}
