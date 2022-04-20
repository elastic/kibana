/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { sortPackageJson } from '@kbn/sort-package-json';

export async function regeneratePackageJson(rootPath: string) {
  const path = Path.resolve(rootPath, 'package.json');
  const json = await Fsp.readFile(path, 'utf8');
  await Fsp.writeFile(path, sortPackageJson(json));
}
