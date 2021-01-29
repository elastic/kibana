/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { copyAll, Task } from '../lib';

export const CopySource: Task = {
  description: 'Copying source into platform-generic build directory',

  async run(config, log, build) {
    await copyAll(config.resolveFromRepo(), build.resolvePath(), {
      dot: false,
      select: [
        'yarn.lock',
        '.npmrc',
        'src/**',
        '!src/**/*.{test,test.mocks,mock}.{js,ts,tsx}',
        '!src/**/mocks.ts', // special file who imports .mock files
        '!src/**/{target,__tests__,__snapshots__,__mocks__}/**',
        '!src/core/server/core_app/assets/favicons/favicon.distribution.png',
        '!src/core/server/core_app/assets/favicons/favicon.distribution.svg',
        '!src/test_utils/**',
        '!src/fixtures/**',
        '!src/cli/repl/**',
        '!src/cli/dev.js',
        '!src/functional_test_runner/**',
        '!src/dev/**',
        // this is the dev-only entry
        '!src/setup_node_env/index.js',
        '!**/public/**/*.{js,ts,tsx,json}',
        'typings/**',
        'config/kibana.yml',
        'config/node.options',
        'tsconfig*.json',
        '.i18nrc.json',
        'kibana.d.ts',
      ],
    });
  },
};
