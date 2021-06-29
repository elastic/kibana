/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { getInstalledPackages } from '../../../npm';

export const UpdateHapiCommercialLicenseTask = {
  description: 'Updating packages in the @commercial namespace with custom LICENSE file',

  async run(config, log, build) {
    log.info('Finding installed production packages in the @commercial namespace');
    const packages = (await getInstalledPackages({ directory: build.resolvePath() }))
      .filter((pkg) => pkg.name.startsWith('@commercial/'));
    return Promise.all(
      packages.map(async ({ directory }) => await addNewLicense(directory, log))
    );
  }
};

async function addNewLicense(packageDirectory, log) {
  const oldPath = join(packageDirectory, 'LICENSE.md');
  log.info(`Deleting old license at ${oldPath}`);
  await fs.unlink(oldPath);

  const templatePath = join(__dirname, 'license_template');
  const newPath = join(packageDirectory, 'LICENSE');
  log.info(`Adding new license at ${newPath}`);
  await fs.copyFile(templatePath, newPath);
}