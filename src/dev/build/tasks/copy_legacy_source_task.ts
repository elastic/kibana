/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

import { getPackages } from '@kbn/repo-packages';
import globby from 'globby';
import Piscina from 'piscina';

import { Task } from '../lib';

export const CopyLegacySource: Task = {
  description: 'Copying legacy/non-package source into platform-generic build directory',

  async run(config, log) {
    const select = [
      'yarn.lock',
      '.npmrc',
      '.puppeteerrc',
      'config/kibana.yml',
      'config/node.options',
      '.i18nrc.json',
      'src/cli/**',
      'src/cli_*/**',
      'src/setup_node_env/**',
      '!src/cli*/dev.js',
      '!src/setup_node_env/index.js',

      'x-pack/.i18nrc.json',
      'x-pack/package.json',

      '!**/jest*',
      '!**/*.{story,stories}.{js,ts}',
      '!**/{test_mocks,stubs}.ts',
      '!**/*.{scss,console,d.ts,sh,md,mdx,asciidoc,docnav.json,http}',
      '!**/*.{test,test.mocks,mock,mocks,spec}.*',
      '!**/{packages,dev_docs,docs,public,__stories__,storybook,.storybook,ftr_e2e,e2e,scripts,test,tests,test_resources,test_data,__tests__,manual_tests,__jest__,__snapshots__,__mocks__,mock_responses,mocks,fixtures,__fixtures__,cypress,integration_tests}/**',
      '!**/http-client.env.json',

      // explicitly exclude every package directory outside of the root packages dir
      ...getPackages(config.resolveFromRepo('.')).flatMap((p) =>
        p.normalizedRepoRelativeDir.startsWith('packages/')
          ? []
          : `!${p.normalizedRepoRelativeDir}/**`
      ),
    ];

    const piscina = new Piscina({
      filename: resolve(__dirname, 'copy_source_worker.js'),
    });

    const globbyOptions = { cwd: config.resolveFromRepo('.') };
    const promises = [];
    for await (const source of globby.stream(select, globbyOptions)) {
      promises.push(piscina.run({ source }));
    }
    await Promise.all(promises);
    await piscina.destroy();

    log.success('copied and transpiled', promises.length, 'files');
  },
};
