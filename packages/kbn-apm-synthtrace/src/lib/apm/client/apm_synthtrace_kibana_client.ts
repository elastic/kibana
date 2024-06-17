/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { Logger } from '../../utils/create_logger';
import { kibanaHeaders } from '../../shared/client_headers';
import { getFetchAgent } from '../../../cli/utils/ssl';

export class ApmSynthtraceKibanaClient {
  private readonly logger: Logger;
  private target: string;

  constructor(options: { logger: Logger; target: string }) {
    this.logger = options.logger;
    this.target = options.target;
  }

  getFleetApmPackagePath(packageVersion?: string): string {
    let path = `${this.target}/api/fleet/epm/packages/apm`;
    if (packageVersion) {
      path = `${path}/${packageVersion}`;
    }
    return path;
  }

  async fetchLatestApmPackageVersion() {
    this.logger.debug(`Fetching latest APM package version`);
    const url = `${this.getFleetApmPackagePath()}?prerelease=true`;
    const response = await fetch(url, {
      method: 'GET',
      headers: kibanaHeaders(),
      agent: getFetchAgent(url),
    });

    const responseJson = await response.json();

    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch latest APM package version, received HTTP ${response.status} and message: ${responseJson.message}`
      );
    }

    const { latestVersion } = responseJson.item;

    return latestVersion as string;
  }

  async installApmPackage(packageVersion?: string) {
    this.logger.debug(`Installing APM package ${packageVersion}`);
    if (!packageVersion) {
      packageVersion = await this.fetchLatestApmPackageVersion();
    }

    const url = this.getFleetApmPackagePath(packageVersion);
    const response = await pRetry(
      async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers: kibanaHeaders(),
          body: '{"force":true}',
          agent: getFetchAgent(url),
        });

        if (!res.ok) {
          const errorJson = await res.json();
          const errorMessage =
            typeof errorJson.message === 'string'
              ? errorJson.message
              : 'An error occurred during APM package installation.';
          throw new Error(
            `APM package installation returned ${res.status} status code\nError: ${errorMessage}`
          );
        }
        return res;
      },
      {
        retries: 5,
        onFailedAttempt: (error) => {
          this.logger.debug(
            `APM package installation failure. ${error.retriesLeft >= 1 ? 'Retrying' : 'Aborting'}`
          );
        },
      }
    );

    const responseJson = await response.json();

    if (!responseJson.items) {
      throw new Error(
        `No installed assets received for APM package version ${packageVersion}, received HTTP ${response.status} for url ${url}`
      );
    }

    this.logger.info(`Installed APM package ${packageVersion}`);
    return { version: packageVersion };
  }

  async uninstallApmPackage() {
    this.logger.debug('Uninstalling APM package');
    const latestApmPackageVersion = await this.fetchLatestApmPackageVersion();

    const url = this.getFleetApmPackagePath(latestApmPackageVersion);
    const response = await pRetry(
      async () => {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: kibanaHeaders(),
          body: '{"force":true}',
          agent: getFetchAgent(url),
        });

        if (!res.ok) {
          const errorJson = await res.json();
          const errorMessage =
            typeof errorJson.message === 'string'
              ? errorJson.message
              : 'An error occurred during APM package uninstallation.';
          throw new Error(
            `APM package uninstallation returned ${res.status} status code\nError: ${errorMessage}`
          );
        }
        return res;
      },
      {
        retries: 5,
        onFailedAttempt: (error) => {
          this.logger.debug(
            `APM package version ${latestApmPackageVersion} uninstallation failure. ${
              error.retriesLeft >= 1 ? 'Retrying' : 'Aborting'
            }`
          );
        },
      }
    );

    const responseJson = await response.json();

    if (!responseJson.items) {
      throw new Error(
        `No uninstalled assets received for APM package version ${latestApmPackageVersion}, received HTTP ${response.status} for url ${url}`
      );
    }

    this.logger.info(`Uninstalled APM package ${latestApmPackageVersion}`);
  }
}
