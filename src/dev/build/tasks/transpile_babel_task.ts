/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';
import { writeFile } from 'fs/promises';
import { transformFileAsync } from '@babel/core';

import { Task } from '../lib';

export const TranspileBabel: Task = {
  description: 'Transpile node files with babel',

  async run(config, log, build) {
    const files = globby.stream(['{x-pack,src}/**/*.{js,ts,tsx}', '!{x-pack,src}/**/*.d.ts'], {
      cwd: build.resolvePath('.'),
      absolute: true,
    });
    const options = {
      presets: [
        [
          require.resolve('@kbn/babel-preset/node_preset'),
          { 'kibana/rootDir': build.resolvePath('.') },
        ],
      ],
      cwd: build.resolvePath('.'),
      babelrc: false,
      sourceMaps: false,
      ast: false,
      minified: true,
    };
    for await (const file of files) {
      const input = file.toString();
      const output = await transformFileAsync(input, options);
      if (output?.code) {
        const dest = input.substring(0, input.lastIndexOf('.')) + '.js';
        await writeFile(dest, output.code);
      }
    }
  },
};
