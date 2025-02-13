/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { Logger } from '../../utils/create_logger';
import { kibanaHeaders } from '../../shared/client_headers';
import { getFetchAgent } from '../../../cli/utils/ssl';

export class ApmSynthtraceKibanaClient {
  private readonly logger: Logger;
  private target: string;
  private headers: Record<string, string>;

  constructor(options: { logger: Logger; target: string; headers?: Record<string, string> }) {
    this.logger = options.logger;
    this.target = options.target;
    this.headers = { ...kibanaHeaders(), ...(options.headers ?? {}) };
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

    const fetchPackageVersion = async ({ prerelease }: { prerelease: boolean }) => {
      const url = `${this.getFleetApmPackagePath()}?prerelease=${prerelease}`;
      this.logger.debug(`Fetching from URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        agent: getFetchAgent(url),
      });

      const responseJson = await response.json();

      if (response.status !== 200) {
        throw new Error(
          `Failed to fetch APM package version, received HTTP ${response.status} and message: ${responseJson.message}`
        );
      }

      // Add support for 7.x stack as latest version is available under different node
      if (responseJson.response && responseJson.response.latestVersion) {
        return responseJson.response.latestVersion as string;
      }

      return responseJson.item.latestVersion as string;
    };

    try {
      return await fetchPackageVersion({ prerelease: true });
    } catch (error) {
      this.logger.debug(
        'Fetching latestes prerelease version failed, retrying with latest GA version'
      );
      const retryResult = await fetchPackageVersion({ prerelease: false }).catch((retryError) => {
        throw retryError;
      });

      return retryResult;
    }
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
          headers: this.headers,
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
          headers: this.headers,
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
