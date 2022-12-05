/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import url from 'url';
import { Logger } from '../../utils/create_logger';

export class ApmSynthtraceKibanaClient {
  private readonly logger: Logger;
  constructor(options: { logger: Logger }) {
    this.logger = options.logger;
  }

  async discoverLocalKibana(suspectedKibanaUrl: string = 'http://localhost:5601') {
    let credentials = [
      // yarn es
      { username: 'elastic', password: 'changeme' },
      // apm integration testing
      { username: 'admin', password: 'changeme' },
    ];

    const parsedKibanaUrl = url.parse(suspectedKibanaUrl);

    if (parsedKibanaUrl.auth) {
      const [username, password] = parsedKibanaUrl.auth.split(':');
      credentials = [{ username, password }];
    }

    for (const auth of credentials) {
      try {
        const kibanaUrlWithAuth = url.format({
          ...parsedKibanaUrl,
          auth: `${auth.username}:${auth.password}`,
        });

        const unredirectedResponse = await fetch(kibanaUrlWithAuth, {
          method: 'HEAD',
          follow: 1,
          redirect: 'manual',
        });

        const discoveredKibanaUrl = unredirectedResponse.headers.get('location')!;

        const redirectedResponse = await fetch(kibanaUrlWithAuth, {
          method: 'HEAD',
        });

        if (redirectedResponse.status === 401) {
          continue;
        }

        this.logger.info(`Discovered local kibana running at: ${discoveredKibanaUrl}`);

        return url.format({
          ...url.parse(discoveredKibanaUrl),
          auth: `${auth.username}:${auth.password}`,
        });
      } catch (error) {
        this.logger.debug(`Could not connect to kibana using ${auth.username}:${auth.password}`);
      }
    }

    throw new Error(`Could not connect to Kibana at ${suspectedKibanaUrl}`);
  }

  async fetchLatestApmPackageVersion(kibanaUrl: string) {
    const fleetPackageApiUrl = `${kibanaUrl}/api/fleet/epm/packages/apm`;
    const response = await fetch(fleetPackageApiUrl, {
      method: 'GET',
      headers: kibanaHeaders(),
    });
    const json = (await response.json()) as { item: { latestVersion: string } };

    const { latestVersion } = json.item;
    return latestVersion;
  }

  async installApmPackage(kibanaUrl: string, packageVersion: string) {
    const response = await fetch(`${kibanaUrl}/api/fleet/epm/packages/apm/${packageVersion}`, {
      method: 'POST',
      headers: kibanaHeaders(),
      body: '{"force":true}',
    });

    const responseJson = await response.json();

    if (responseJson.statusCode) {
      throw Error(
        `unable to install apm package ${packageVersion}. Received status code: ${responseJson.statusCode} and message: ${responseJson.message}`
      );
    }
    if (responseJson.items) {
      this.logger.info(`Installed apm package ${packageVersion}`);
    } else this.logger.error(responseJson);
  }
}

function kibanaHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'kibana',
  };
}
