/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const pluginFunctionalConfig = await readConfigFile(require.resolve('./config.ts'));

  return {
    ...pluginFunctionalConfig.getAll(),
    testFiles: [
      require.resolve('./test_suites/core_plugins'),
      require.resolve('./test_suites/application_links'),
    ],
    kbnTestServer: {
      ...pluginFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...pluginFunctionalConfig.get('kbnTestServer.serverArgs'),
        // Enables concurrent React root for plugins that render react using @kbn/react-dom-swap
        '--coreConcurrentReact.enabled=true',
      ],
    },
  };
}
