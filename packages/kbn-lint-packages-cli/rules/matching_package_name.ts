/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PackageRule } from '@kbn/repo-linter';
import { setProp } from '@kbn/json-ast';

export const matchingPackageNameRule = PackageRule.create('matchingPackageName', {
  async check({ pkg }) {
    if (pkg.pkg && pkg.pkg?.name !== pkg.manifest.id) {
      this.err(
        'The "name" in the package.json file must match the "id" from the kibana.jsonc file',
        {
          'package.json': (source) =>
            setProp(source, 'name', pkg.manifest.id, {
              insertAtTop: true,
            }),
        }
      );
    }
  },
});
