/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '../../lib/paths.mjs';
import External from '../../lib/external_packages.js';

export async function sortPackageJson() {
  const { sortPackageJson } = External['@kbn/sort-package-json']();

  const path = Path.resolve(REPO_ROOT, 'package.json');
  const json = Fs.readFileSync(path, 'utf8');
  Fs.writeFileSync(path, sortPackageJson(json));
}
