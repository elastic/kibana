/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import { getPackages } from '@kbn/repo-packages';
import globby from 'globby';
import Piscina from 'piscina';

import { Task } from '../lib';

export const CopySource: Task = {
  description: 'Copying source into platform-generic build directory',

  async run(config, log, build) {
    const select = [
      'yarn.lock',
      '.npmrc',
      'config/kibana.yml',
      'config/node.options',
      '.i18nrc.json',
      'src/**',

      'x-pack/plugins/**',
      'x-pack/.i18nrc.json',
      'x-pack/package.json',

      '!src/dev/**',
      '!src/**/mocks.{js,ts}',
      '!src/cli*/dev.js',
      '!src/plugins/telemetry/schema/**',
      '!src/setup_node_env/index.js',

      '!x-pack/plugins/telemetry_collection_xpack/schema/**',

      '!**/jest*',
      '!**/*.{story,stories}.{js,ts}',
      '!**/{test_mocks,stubs}.ts',
      '!**/*.{scss,console,d.ts,sh,md,mdx,asciidoc,docnav.json}',
      '!**/*.{test,test.mocks,mock,mocks,spec}.*',
      '!**/{packages,dev_docs,docs,public,__stories__,storybook,.storybook,ftr_e2e,e2e,scripts,test,tests,test_resources,test_data,__tests__,manual_tests,__jest__,__snapshots__,__mocks__,mock_responses,mocks,fixtures,__fixtures__,cypress,integration_tests}/**',

      '!x-pack/plugins/lens/to_playground.gif', // README.md
      '!x-pack/plugins/lens/layout.png', // README.md
      '!x-pack/plugins/cases/images', // README.md
      '!x-pack/plugins/canvas/images', // unused

      // explicitly exclude every package directory outside of the root packages dir
      `!{${getPackages(config.resolveFromRepo('.'))
        .flatMap((p) =>
          p.normalizedRepoRelativeDir.startsWith('packages/') ? [] : p.normalizedRepoRelativeDir
        )
        .join(',')}}/**`,
    ];

    const piscina = new Piscina({
      filename: resolve(__dirname, 'copy_source_worker.js'),
      workerData: {
        ignoredPkgIds: await config.getPkgIdsInNodeModules(),
      },
    });

    const globbyOptions = { cwd: config.resolveFromRepo('.') };
    const tasks = (
      await Promise.all([
        globby(select, globbyOptions),
        globby(
          [
            '{x-pack,src}/plugins/*/public/assets/**',
            'src/plugins/data/server/scripts/**',
            'x-pack/plugins/fleet/server/services/epm/packages/**',
            '!x-pack/plugins/fleet/server/services/epm/packages/*.test.ts',
          ],
          globbyOptions
        ),
      ])
    )
      .flat()
      .map((source) => piscina.run({ source }));

    await Promise.all(tasks);
    await piscina.destroy();

    log.success('copied and transpiled', tasks.length, 'files');
  },
};
