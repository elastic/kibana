/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Url from 'url';
import * as Fs from 'fs';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { Client as EsClient, ClientOptions, HttpConnection } from '@elastic/elasticsearch';
import type { Config } from '../functional_test_runner';

/** options for creating es instances used in functional testing scenarios */
export interface EsClientForTestingOptions extends Omit<ClientOptions, 'node' | 'nodes' | 'tls'> {
  /** url of es instance */
  esUrl: string;
  /** overwrite the auth embedded in the url to use a different user in this client instance */
  authOverride?: { username: string; password: string };
  /**
   * are we running tests against cloud? this is automatically determined
   * by checking for the TEST_CLOUD environment variable but can be overriden
   * for special cases
   */
  isCloud?: boolean;
}

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

export function createEsClientForTesting(options: EsClientForTestingOptions) {
  const { esUrl, authOverride, isCloud = !!process.env.TEST_CLOUD, ...otherOptions } = options;

  const url = options.authOverride
    ? Url.format({
        ...Url.parse(options.esUrl),
        auth: `${options.authOverride.username}:${options.authOverride.password}`,
      })
    : options.esUrl;

  return new EsClient({
    Connection: HttpConnection,
    tls: isCloud ? undefined : { ca: Fs.readFileSync(CA_CERT_PATH) },

    ...otherOptions,

    // force nodes config
    nodes: [url],
  });
}
