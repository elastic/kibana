/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dedent from 'dedent';
import { createFailError } from '@kbn/dev-utils';

interface Options {
  packages: Array<{
    name: string;
    version: string;
    relative: string;
    licenses: string[];
  }>;
  validLicenses: string[];
}

/**
 *  When given a list of packages and the valid license
 *  options, either throws an error with details about
 *  violations or returns undefined.
 */
export function assertLicensesValid({ packages, validLicenses }: Options) {
  const invalidMsgs = packages.reduce((acc, pkg) => {
    const invalidLicenses = pkg.licenses.filter((license) => !validLicenses.includes(license));

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
