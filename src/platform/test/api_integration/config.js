/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { services } from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    rootTags: ['runOutsideOfCiGroups'],
    testFiles: [require.resolve('./apis')],
    services,
    servers: commonConfig.get('servers'),
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    junit: {
      reportName: 'API Integration Tests',
    },
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--elasticsearch.healthCheck.delay=3600000',
        '--server.xsrf.disableProtection=true',
        '--server.compression.referrerWhitelist=["some-host.com"]',
        '--server.compression.brotli.enabled=true',
        `--savedObjects.maxImportExportSize=10001`,
        '--savedObjects.maxImportPayloadBytes=30000000',
        // for testing set buffer duration to 0 to immediately flush counters into saved objects.
        '--usageCollection.usageCounters.bufferDuration=0',
      ],
    },
  };
}
