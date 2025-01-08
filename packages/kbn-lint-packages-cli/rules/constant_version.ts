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

export const constantVersionRule = PackageRule.create('constantVersion', {
  async check({ pkg }) {
    if (pkg.pkg && pkg.pkg.version !== '1.0.0') {
      this.err('The "version" in the package.json file must be "1.0.0"', {
        'package.json': (source) =>
          setProp(source, 'version', '1.0.0', {
            insertAfter: getProp(source, 'name'),
          }),
      });
    }
  },
});
