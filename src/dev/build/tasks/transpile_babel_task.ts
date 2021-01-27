/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { pipeline } from 'stream';
import { promisify } from 'util';

// @ts-expect-error @types/gulp-babel is outdated and doesn't work for gulp-babel v8
import gulpBabel from 'gulp-babel';
import vfs from 'vinyl-fs';

import { Task, Build } from '../lib';

const asyncPipeline = promisify(pipeline);

const transpileWithBabel = async (srcGlobs: string[], build: Build, presets: string[]) => {
  const buildRoot = build.resolvePath();

  await asyncPipeline(
    vfs.src(
      srcGlobs.concat([
        '!**/*.d.ts',
        '!packages/**',
        '!**/node_modules/**',
        '!**/bower_components/**',
        '!**/__tests__/**',
      ]),
      {
        cwd: buildRoot,
      }
    ),

    gulpBabel({
      babelrc: false,
      presets,
    }),

    vfs.dest(buildRoot)
  );
};

export const TranspileBabel: Task = {
  description: 'Transpiling sources with babel',

  async run(config, log, build) {
    // Transpile server code
    await transpileWithBabel(['**/*.{js,ts,tsx}', '!**/public/**'], build, [
      require.resolve('@kbn/babel-preset/node_preset'),
    ]);

    // Transpile client code
    // NOTE: For the client, as we have the optimizer, we are only
    // pre-transpiling the typescript based files
    await transpileWithBabel(['**/public/**/*.{ts,tsx}'], build, [
      require.resolve('@kbn/babel-preset/webpack_preset'),
    ]);
  },
};
