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

import licenseChecker from 'license-checker';

async function runLicenseChecker(directory, dev) {
  return new Promise((resolve, reject) => {
    licenseChecker.init({
      start: directory,
      development: dev,
      production: !dev,
      json: true,
      customFormat: {
        realPath: true,
        licenseText: false,
        licenseFile: false
      }
    }, (err, licenseInfo) => {
      if (err) reject(err);
      else {
        resolve(
          // Extend original licenseInfo object with a new attribute
          // stating whether a license was found in a package used
          // only as a dev dependency or not
          Object.keys(licenseInfo).reduce(function (result, key) {
            result[key] = Object.assign(licenseInfo[key], { isDevOnly: dev });
            return result;
          }, {})
        );
      }
    });
  });
}

export async function callLicenseChecker(options = {}) {
  const {
    directory,
    dev = false
  } = options;

  if (!directory) {
    throw new Error('You must specify the directory where license checker should start');
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Run license checker for prod only packages
      const prodOnlyLicenses = await runLicenseChecker(directory, false);

      if (!dev) {
        resolve(prodOnlyLicenses);
        return;
      }

      // In case we have the dev option
      // also run the license checker for the
      // dev only packages and build a final object
      // merging the previous results too
      const devOnlyLicenses = await runLicenseChecker(directory, true);
      resolve(Object.assign(prodOnlyLicenses, devOnlyLicenses));
    } catch (e) {
      reject(e);
    }
  });
}
