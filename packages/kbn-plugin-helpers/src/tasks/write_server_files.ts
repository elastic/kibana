/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipeline } from 'stream';
import { promisify } from 'util';

import vfs from 'vinyl-fs';
import { transformFileStream } from '@kbn/dev-utils';
import { transformFileWithBabel } from './transform_file_with_babel';

import { TaskContext } from '../task_context';

const asyncPipeline = promisify(pipeline);

export async function writeServerFiles({
  log,
  config,
  plugin,
  sourceDir,
  buildDir,
  kibanaVersion,
}: TaskContext) {
  log.info('copying server source into the build and converting with babel');

  // copy source files and apply some babel transformations in the process
  await asyncPipeline(
    vfs.src(
      [
        'kibana.json',
        '.i18nrc.json',
        ...(plugin.manifest.server
          ? config.serverSourcePatterns || [
              'yarn.lock',
              'tsconfig.json',
              'package.json',
              'index.{js,ts}',
              '{lib,server,common,translations}/**/*',
            ]
          : []),
      ],
      {
        cwd: sourceDir,
        base: sourceDir,
        buffer: true,
        ignore: [
          '**/*.d.ts',
          '**/public/**',
          '**/__tests__/**',
          '**/*.{test,test.mocks,mock,mocks}.*',
        ],
        allowEmpty: true,
        encoding: false,
      }
    ),

    // add kibanaVersion to kibana.json files
    transformFileStream((file) => {
      if (file.relative !== 'kibana.json') {
        return;
      }

      const json = file.contents.toString('utf8');
      const manifest = JSON.parse(json);
      file.contents = Buffer.from(
        JSON.stringify(
          {
            ...manifest,
            kibanaVersion,
          },
          null,
          2
        )
      );
    }),

    transformFileStream(async (file) => {
      if (file.path.includes('node_modules')) {
        return;
      }

      if (['.js', '.ts', '.tsx'].includes(file.extname)) {
        await transformFileWithBabel(file);
      }
    }),

    vfs.dest(buildDir)
  );
}
