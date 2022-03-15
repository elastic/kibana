/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
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
}
