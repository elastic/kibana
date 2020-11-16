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

import { pipeline } from 'stream';
import { promisify } from 'util';

import semver from 'semver';
import vfs from 'vinyl-fs';
import { transformFileWithBabel, transformFileStream } from '@kbn/dev-utils';

import { BuildContext } from '../build_context';

const asyncPipeline = promisify(pipeline);

export async function writeServerFiles({
  log,
  config,
  plugin,
  sourceDir,
  buildDir,
  kibanaVersion,
}: BuildContext) {
  log.info('copying server source into the build and converting with babel');

  const KIBANA_VERSION_79 = semver.satisfies(kibanaVersion, '~7.9.0');

  // copy source files and apply some babel transformations in the process
  await asyncPipeline(
    vfs.src(
      [
        'kibana.json',
        // always copy over the package.json file if we're building for 7.9
        ...(KIBANA_VERSION_79 ? ['package.json'] : []),
        // always copy over server files if we're building for 7.9, otherwise rely on `server: true` in kibana.json manifest
        ...(KIBANA_VERSION_79 || plugin.manifest.server
          ? config.serverSourcePatterns || [
              'yarn.lock',
              'tsconfig.json',
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
      }
    ),

    // add kibanaVersion to kibana.json files and kibana.version to package.json files
    // we don't check for `kibana.version` in 7.10+ but the plugin helpers can still be used
    // to build plugins for older Kibana versions so we do our best to support those needs by
    // setting the property if the package.json file is encountered
    transformFileStream((file) => {
      if (file.relative !== 'kibana.json' && file.relative !== 'package.json') {
        return;
      }

      const json = file.contents.toString('utf8');
      const parsed = JSON.parse(json);

      file.contents = Buffer.from(
        JSON.stringify(
          file.relative === 'kibana.json'
            ? {
                ...parsed,
                kibanaVersion,
              }
            : {
                ...parsed,
                kibana: {
                  ...parsed.kibana,
                  version: kibanaVersion,
                },
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
