/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import Semver from 'semver';
import { Logger } from '../../utils/create_logger';

export class ApmSynthtraceKibanaClient {
  constructor(private readonly logger: Logger) {}

  async migrateCloudToManagedApm(cloudId: string, username: string, password: string) {
    await this.logger.perf('migrate_apm_on_cloud', async () => {
      this.logger.info('attempting to migrate cloud instance over to managed APM');
      const cloudUrls = Buffer.from(cloudId.split(':')[1], 'base64').toString().split('$');
      const kibanaCloudUrl = `https://${cloudUrls[2]}.${cloudUrls[0]}`;
      const response = await fetch(
        kibanaCloudUrl + '/internal/apm/fleet/cloud_apm_package_policy',
        {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          headers: {
            Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'kbn-xsrf': 'kibana',
          },
        }
      );
      const responseJson = await response.json();
      if (responseJson.message) {
        this.logger.info(`Cloud Instance already migrated to managed APM: ${responseJson.message}`);
      }
      if (responseJson.cloudApmPackagePolicy) {
        this.logger.info(
          `Cloud Instance migrated to managed APM: ${responseJson.cloudApmPackagePolicy.package.version}`
        );
      }
    });
  }

  async discoverLocalKibana() {
    return await fetch('http://localhost:5601', {
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
    }).then((res) => {
      const kibanaUrl = res.headers.get('location');
      this.logger.info(`Discovered local kibana running at: ${kibanaUrl}`);
      return kibanaUrl;
    });
  }
  async fetchLatestApmPackageVersion(currentKibanaVersion: string) {
    const url =
      'https://epr-snapshot.elastic.co/search?package=apm&prerelease=true&all=true&kibana.version=';
    const response = await fetch(url + currentKibanaVersion, { method: 'GET' });
    const json = (await response.json()) as Array<{ version: string }>;
    const packageVersions = (json ?? []).map((item) => item.version).sort(Semver.rcompare);
    const validPackageVersions = packageVersions.filter((v) => Semver.valid(v));
    const bestMatch = validPackageVersions[0];
    if (!bestMatch) {
      throw new Error(
        `None of the available APM package versions matches the current Kibana version (${currentKibanaVersion}). The latest available version is ${packageVersions[0]}. This can happen if the Kibana version was recently bumped, and no matching APM package was released. Reach out to the fleet team if this persists.`
      );
    }
    return bestMatch;
  }

  async installApmPackage(kibanaUrl: string, version: string, username: string, password: string) {
    const packageVersion = await this.fetchLatestApmPackageVersion(version);
    const response = await fetch(kibanaUrl + '/api/fleet/epm/packages/apm/' + packageVersion, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'kbn-xsrf': 'kibana',
      },
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
