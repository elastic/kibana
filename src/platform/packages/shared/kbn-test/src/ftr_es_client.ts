/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Url from 'url';

import { createEsClientForTesting, type EsClientForTestingOptions } from '@kbn/test-es-server';
import type { Config } from './functional_test_runner';

export type { EsClientForTestingOptions };

export function createRemoteEsClientForFtrConfig(
  config: Config,
  overrides?: Omit<EsClientForTestingOptions, 'esUrl'>
) {
  const ccsConfig = config.get('esTestCluster.ccs');
  if (!ccsConfig) {
    throw new Error('FTR config is missing esTestCluster.ccs');
  }

  return createEsClientForTesting({
    esUrl: ccsConfig.remoteClusterUrl,
    requestTimeout: config.get('timeouts.esRequestTimeout'),
    ...overrides,
  });
}

export function createEsClientForFtrConfig(
  config: Config,
  overrides?: Omit<EsClientForTestingOptions, 'esUrl'>
) {
  const esUrl = Url.format(config.get('servers.elasticsearch'));
  return createEsClientForTesting({
    esUrl,
    requestTimeout: config.get('timeouts.esRequestTimeout'),
    ...overrides,
  });
}
