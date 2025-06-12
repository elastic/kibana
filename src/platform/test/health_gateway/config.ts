/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    services,
    rootTags: ['runOutsideOfCiGroups'],
    esTestCluster: functionalConfig.get('esTestCluster'),
    servers: functionalConfig.get('servers'),
    testFiles: [require.resolve('./tests')],
    junit: {
      reportName: 'Health Gateway Functional Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--env.name=development',
        `--plugin-path=${path.resolve(__dirname, 'plugins/status')}`,
      ],
    },
  };
}
