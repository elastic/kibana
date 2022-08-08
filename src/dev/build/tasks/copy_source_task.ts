/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverBazelPackages } from '@kbn/bazel-packages';

import { copyAll, Task } from '../lib';

export const CopySource: Task = {
  description: 'Copying source into platform-generic build directory',

  async run(config, log, build) {
    await copyAll(config.resolveFromRepo(), build.resolvePath(), {
      dot: false,
      select: [
        'yarn.lock',
        '.npmrc',
        'kibana.d.ts',
        'config/kibana.yml',
        'config/node.options',
        'typings/**',
        'tsconfig*.json',
        '.i18nrc.json',
        'src/**',

        'x-pack/plugins/**',
        'x-pack/.i18nrc.json',
        'x-pack/package.json',

        '!{src,x-pack}/**/*.{test,test.mocks,mock,mocks}.*',
        '!{src,x-pack}/**/target/**',
        '!{src,x-pack}/**/{__stories__,storybook,.storybook}/**',
        '!{src,x-pack}/**/{test,tests,test_resources,test_data,__tests__,manual_tests,__jest__,__snapshots__,__mocks__,mock_responses,mocks,fixtures,__fixtures__,cypress,integration_tests}/**',

        '!src/dev/**',
        '!src/**/mocks.{js,ts}',
        '!src/cli/repl/**',
        '!src/cli*/dev.js',
        '!src/plugins/telemetry/schema/**',
        '!src/core/server/core_app/assets/favicons/favicon.distribution.{ico,png,svg}',
        '!src/functional_test_runner/**',
        '!src/setup_node_env/index.js',

        '!x-pack/plugins/**/{ftr_e2e,e2e}/**',
        '!x-pack/plugins/**/scripts/**',
        '!x-pack/plugins/telemetry_collection_xpack/schema/**',

        '!**/jest.config.js',
        '!**/jest.config.dev.js',
        '!**/jest.integration.config.js',
        '!**/jest_setup.{js,ts}',
        '!**/*.{story,stories}.{js,ts}',
        '!**/test_mocks.ts',
        '!**/*.{sh,md,mdx,asciidoc}',
        '!**/*.console',
        '!**/*.scss',
        '!**/*.docnav.json',
        '!**/{dev_docs,docs}/**',
        '!**/public/**/*.{js,ts,tsx,json}',

        // explicitly ignore all bazel package locations, even if they're not selected by previous patterns
        ...(await discoverBazelPackages()).map((pkg) => `!${pkg.normalizedRepoRelativeDir}/**`),
      ],
    });
  },
};
