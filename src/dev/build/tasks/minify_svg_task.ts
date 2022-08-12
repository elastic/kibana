/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';
import { writeFile, readFile } from 'fs/promises';
import { optimize } from 'svgo';

import { Task } from '../lib';

export const MinifySVG: Task = {
  description: 'Minify SVG files',

  async run(config, log, build) {
    const files = globby.stream(['**/*.svg'], {
      cwd: build.resolvePath('.'),
      absolute: true,
    });
    const options = {
      multipass: false,
      removeComments: false,
    };
    for await (const file of files) {
      const input = await readFile(file.toString(), 'utf-8');
      const result = optimize(input, {
        path: config.getRepoRelativePath(file.toString()),
        ...options,
      }) as any;
      if (result.error) throw new Error(result.error);
      if (typeof result.data === 'string') {
        const output = Buffer.from(result.data);
        await writeFile(file, output);
      }
    }
  },
};
