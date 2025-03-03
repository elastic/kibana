/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PackageRule } from '@kbn/repo-linter';
import { setProp, getProp } from '@kbn/json-ast';

const DEFAULT_LICENSE = 'Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0';
const XPACK_LICENSE = 'Elastic License 2.0';
const LICENSE_EXCEPTIONS = Object.entries({
  MIT: ['@kbn/safer-lodash-set', '@kbn/handlebars', '@kbn/expect'],
});

export const noLicenseRule = PackageRule.create('noLicense', {
  async check({ pkg }) {
    if (!pkg.pkg) {
      return;
    }

    const exception = LICENSE_EXCEPTIONS.find(([, pkgIds]) => pkgIds.includes(pkg.id));
    const expected = exception
      ? exception[0]
      : pkg.normalizedRepoRelativeDir.startsWith('x-pack')
      ? XPACK_LICENSE
      : DEFAULT_LICENSE;

    if (pkg.pkg.license !== expected) {
      this.err(`The "license" in the package.json file must be ${expected}`, {
        'package.json': (source) =>
          setProp(source, 'license', expected, {
            insertAfter: getProp(source, 'version') ?? getProp(source, 'name'),
          }),
      });
    }
  },
});
