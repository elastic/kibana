/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { services } from './services';

/*
 * These tests exist in a separate configuration because:
 * 1) The FTR does not support building and installing plugins against built Kibana.
 *    This test must be run against source only in order to build the fixture plugins.
 * 2) It provides a specific service to make EBT testing easier.
 * 3) The intention is to grow this suite as more developers use this feature.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [require.resolve('./tests')],
    services,
    pageObjects: functionalConfig.get('pageObjects'),
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'Analytics Integration Tests',
    },
    esTestCluster: functionalConfig.get('esTestCluster'),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--telemetry.optIn=true',
        '--server.restrictInternalApis=false',
        `--plugin-path=${path.resolve(__dirname, './plugins/analytics_plugin_a')}`,
        `--plugin-path=${path.resolve(__dirname, './plugins/analytics_ftr_helpers')}`,
      ],
    },
  };
}
