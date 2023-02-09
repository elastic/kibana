/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCliError } from '../../lib/cli_error.mjs';

/**
 * @param {import('@kbn/repo-info').KibanaPackageJson} pkgJson
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function validatePackageJson(pkgJson, log) {
  const failures = false;

  const typesInProd = Object.keys(pkgJson.dependencies).filter((id) => id.startsWith('@types/'));
  if (typesInProd.length) {
    const list = typesInProd.map((id) => `  - ${id}`).join('\n');
    log.error(
      `The following @types/* packages are listed in dependencies but should be in the devDependencies:\n${list}`
    );
  }

  if (failures) {
    throw createCliError('failed to validate package.json, check for errors above');
  }
}
