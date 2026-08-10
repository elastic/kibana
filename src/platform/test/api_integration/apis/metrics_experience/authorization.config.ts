/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';
import { services } from '../../services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiIntegrationConfig = await readConfigFile(require.resolve('../../config.js'));

  return {
    ...apiIntegrationConfig.getAll(),
    rootTags: ['runOutsideOfCiGroups'],
    testFiles: [require.resolve('./authorization')],
    services,
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    junit: {
      reportName: 'Metrics Experience Authorization API Integration Tests',
    },
    esTestCluster: {
      ...apiIntegrationConfig.get('esTestCluster'),
      // Security must be enabled to test Kibana privilege enforcement
      serverArgs: ['xpack.security.enabled=true'],
    },
    kbnTestServer: {
      ...apiIntegrationConfig.get('kbnTestServer'),
      serverArgs: [...apiIntegrationConfig.get('kbnTestServer.serverArgs')],
    },
  };
}
