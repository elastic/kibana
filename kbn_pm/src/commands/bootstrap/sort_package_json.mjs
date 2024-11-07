/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../../lib/paths.mjs';
import External from '../../lib/external_packages.js';

/**
 *
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function sortPackageJson(log) {
  const { sortPackageJson } = External['@kbn/sort-package-json']();

  const path = Path.resolve(REPO_ROOT, 'package.json');
  const json = await Fsp.readFile(path, 'utf8');
  const sorted = sortPackageJson(json);
  if (sorted !== json) {
    await Fsp.writeFile(path, sorted, 'utf8');
    log.success('sorted package.json');
  }
}
