/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import { createFailError } from '@kbn/dev-cli-errors';

interface Options {
  packages: Array<{
    name: string;
    version: string;
    relative: string;
    licenses: string[];
  }>;
  validLicenses: string[];
  perPackageOverrides?: Record<string, string[]>;
}

/**
 *  When given a list of packages and the valid license
 *  options, either throws an error with details about
 *  violations or returns undefined.
 */
export function assertLicensesValid({
  packages,
  validLicenses,
  perPackageOverrides = {},
}: Options) {
  const invalidMsgs = packages.reduce((acc, pkg) => {
    const isValidLicense = (license: string) => validLicenses.includes(license);
    const isValidLicenseForPackage = (license: string) =>
      (perPackageOverrides[`${pkg.name}@${pkg.version}`] || []).includes(license);

    const invalidLicenses = pkg.licenses.filter(
      (license) => !isValidLicense(license) && !isValidLicenseForPackage(license)
    );

    if (pkg.licenses.length && !invalidLicenses.length) {
      return acc;
    }

    return acc.concat(dedent`
        ${pkg.name}
          version: ${pkg.version}
          all licenses: ${pkg.licenses}
          invalid licenses: ${invalidLicenses.join(', ')}
          path: ${pkg.relative}
      `);
  }, [] as string[]);

  if (invalidMsgs.length) {
    throw createFailError(
      `Non-conforming licenses:\n${invalidMsgs
        .join('\n')
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}`
    );
  }
}
