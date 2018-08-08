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

const describeInvalidLicenses = getInvalid => pkg => (
  `
  ${pkg.name}
    version: ${pkg.version}
    all licenses: ${pkg.licenses}
    invalid licenses: ${getInvalid(pkg.licenses).join(', ')}
    path: ${pkg.relative}
`
);

/**
 *  When given a list of packages and the valid license
 *  options, either throws an error with details about
 *  violations or returns undefined.
 *
 *  @param  {Object} [options={}]
 *  @property {Array<Package>} options.packages List of packages to check, see
 *                                              getInstalledPackages() in ../packages
 *  @property {Array<string>} options.validLicenses
 *  @return {undefined}
 */
export function assertLicensesValid(options = {}) {
  const {
    packages,
    validLicenses
  } = options;

  if (!packages || !validLicenses) {
    throw new Error('packages and validLicenses options are required');
  }

  const getInvalid = licenses => (
    licenses.filter(license => !validLicenses.includes(license))
  );

  const isPackageInvalid = pkg => (
    !pkg.licenses.length || getInvalid(pkg.licenses).length > 0
  );

  const invalidMsgs = packages
    .filter(isPackageInvalid)
    .map(describeInvalidLicenses(getInvalid));

  if (invalidMsgs.length) {
    throw new Error(`Non-conforming licenses: ${invalidMsgs.join('')}`);
  }
}
