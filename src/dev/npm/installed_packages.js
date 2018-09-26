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

import { relative, resolve } from 'path';
import { readFileSync } from 'fs';

import { callLicenseChecker } from './license_checker';

function resolveLicense(licenseInfo, key, licenseOverrides) {
  const {
    private: isPrivate,
    licenses: detectedLicenses,
    realPath,
  } = licenseInfo[key];

  // `license-checker` marks all packages that have `private: true`
  // in their `package.json` as "UNLICENSED", so we try to lookup the
  // actual license by reading the license field from their package.json
  if (isPrivate && detectedLicenses === 'UNLICENSED') {
    try {
      const pkg = JSON.parse(readFileSync(resolve(realPath, 'package.json')));
      if (!pkg.license) {
        throw new Error('no license field');
      }
      return [pkg.license];
    } catch (error) {
      throw new Error(`Unable to detect license for \`"private": true\` package at ${realPath}: ${error.message}`);
    }
  }

  return [].concat(
    licenseOverrides[key]
      ? licenseOverrides[key]
      : detectedLicenses
  );
}

/**
 *  Get a list of objects with details about each installed
 *  NPM package.
 *
 *  @param  {Object} [options={}]
 *  @property {String} options.directory root of the project to read
 *  @property {Boolean} [options.dev=false] should development dependencies be included?
 *  @property {Object} [options.licenseOverrides] map of `${name}@${version}` to a list of
 *                                                license ids to override the automatically
 *                                                detected ones
 *  @return {Array<Object>}
 */
export async function getInstalledPackages(options = {}) {
  const {
    directory,
    dev = false,
    licenseOverrides = {}
  } = options;

  if (!directory) {
    throw new Error('You must specify a directory to read installed packages from');
  }

  const licenseInfo = await callLicenseChecker({ directory, dev });
  return Object
    .keys(licenseInfo)
    .map(key => {
      const { realPath, repository } = licenseInfo[key];
      if (realPath === directory) return;

      const keyParts = key.split('@');
      const name = keyParts.slice(0, -1).join('@');
      const version = keyParts[keyParts.length - 1];

      const licenses = resolveLicense(licenseInfo, key, licenseOverrides);

      return {
        name,
        version,
        repository,
        licenses,
        directory: realPath,
        relative: relative(directory, realPath)
      };
    })
    .filter(Boolean);
}
