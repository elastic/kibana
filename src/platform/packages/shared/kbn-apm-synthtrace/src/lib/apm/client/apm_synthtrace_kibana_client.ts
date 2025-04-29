/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pRetry from 'p-retry';
import { KibanaClient, KibanaClientHttpError } from '../../shared/base_kibana_client';
import { Logger } from '../../utils/create_logger';
import { getKibanaClient } from '../../../cli/utils/get_kibana_client';

export class ApmSynthtraceKibanaClient {
  private readonly kibanaClient: KibanaClient;
  private readonly logger: Logger;

  constructor(options: { logger: Logger } & ({ target: string } | { kibanaClient: KibanaClient })) {
    this.kibanaClient = 'kibanaClient' in options ? options.kibanaClient : getKibanaClient(options);
    this.logger = options.logger;
  }

  getFleetApmPackagePath(packageVersion?: string): string {
    let path = `/api/fleet/epm/packages/apm`;
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

      const response = await pRetry(
        async () => {
          return this.kibanaClient
            .fetch<{ item: { latestVersion?: string } }>(url, {
              method: 'GET',
            })
            .catch((error) => {
              const statusCode = error instanceof KibanaClientHttpError ? error.statusCode : 0;
              throw new Error(
                `Failed to fetch APM package version, received HTTP ${statusCode} and message: ${error.message}`
              );
            });
        },
        { retries: 5 }
      );

      if (!response.item.latestVersion) {
        throw new Error(`Failed to fetch APM package version`);
      }
      return response.item.latestVersion;
    };

    try {
      return await fetchPackageVersion({ prerelease: true });
    } catch (error) {
      this.logger.debug(
        'Fetching latestes prerelease version failed, retrying with latest GA version'
      );
      const retryResult = await fetchPackageVersion({ prerelease: false });

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
        const res = await this.kibanaClient
          .fetch<{ items: unknown[] }>(url, {
            method: 'POST',
            body: '{"force":true}',
          })
          .catch((error) => {
            const statusCode = error instanceof KibanaClientHttpError ? error.statusCode : 0;
            throw new Error(
              `APM package installation returned ${statusCode} status code\nError: ${error.message}`
            );
          });

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

    if (!response.items) {
      throw new Error(`No installed assets received for APM package version ${packageVersion}`);
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
        const res = await this.kibanaClient
          .fetch<{ items: unknown[] }>(url, {
            method: 'DELETE',
            body: '{"force":true}',
          })
          .catch((error) => {
            const statusCode = error instanceof KibanaClientHttpError ? error.statusCode : 0;
            throw new Error(
              `APM package uninstallation returned ${statusCode} status code\nError: ${error.message}`
            );
          });

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

    if (!response.items) {
      throw new Error(
        `No uninstalled assets received for APM package version ${latestApmPackageVersion}`
      );
    }

    this.logger.info(`Uninstalled APM package ${latestApmPackageVersion}`);
  }
}
