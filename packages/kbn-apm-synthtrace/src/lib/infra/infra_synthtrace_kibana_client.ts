/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { Logger } from '../utils/create_logger';
import { kibanaHeaders } from '../shared/client_headers';
import { getFetchAgent } from '../../cli/utils/ssl';

export class InfraSynthtraceKibanaClient {
  private readonly logger: Logger;
  private target: string;

  constructor(options: { logger: Logger; target: string; username: string; password: string }) {
    this.logger = options.logger;
    const url = new URL(options.target);
    url.username = options.username;
    url.password = options.password;
    this.target = url.toString();
  }

  async fetchLatestSystemPackageVersion() {
    const fleetPackageApiUrl = join(this.target, '/api/fleet/epm/packages/system?prerelease=true');
    this.logger.debug(`Fetching latest System package version from ${fleetPackageApiUrl}`);
    const response = await fetch(fleetPackageApiUrl, {
      method: 'GET',
      headers: kibanaHeaders(),
      agent: getFetchAgent(fleetPackageApiUrl),
    });

    const responseJson = await response.json();

    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch latest System package version, received HTTP ${response.status} and message: ${responseJson.message}`
      );
    }

    const { latestVersion } = responseJson.item;

    return latestVersion as string;
  }

  async installSystemPackage(packageVersion: string) {
    this.logger.debug(`Installing System package ${packageVersion}`);

    const url = join(this.target, `/api/fleet/epm/packages/system/${packageVersion}`);
    const response = await pRetry(() => {
      return fetch(url, {
        method: 'POST',
        headers: kibanaHeaders(),
        body: '{"force":true}',
        agent: getFetchAgent(url),
      });
    });

    const responseJson = await response.json();

    if (!responseJson.items) {
      throw new Error(
        `Failed to install System package version ${packageVersion}, received HTTP ${response.status} and message: ${responseJson.message} for url ${url}`
      );
    }

    this.logger.info(`Installed System package ${packageVersion}`);
  }
}
