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
