/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../types';

/**
 * Layers data federation settings over a serverless base config. Serverless ES already ships cluster
 * state encryption secrets, but as a release build it keeps ES|QL federation (data source and dataset
 * APIs) off unless explicitly enabled.
 */
export const withServerlessDataFederation = (baseConfig: ScoutServerConfig): ScoutServerConfig => ({
  ...baseConfig,
  esTestCluster: {
    ...baseConfig.esTestCluster,
    serverArgs: [...baseConfig.esTestCluster.serverArgs, 'esql.federation.enabled=true'],
  },
  kbnTestServer: {
    ...baseConfig.kbnTestServer,
    serverArgs: [...baseConfig.kbnTestServer.serverArgs, '--xpack.dataFederation.enabled=true'],
  },
});
