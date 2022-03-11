/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';
import { sortPackageJson as sort } from '@kbn/dev-utils/sort_package_json';
import { Kibana } from './kibana';

export async function sortPackageJson(kbn: Kibana) {
  const packageJsonPath = kbn.getAbsolute('package.json');
  await Fs.writeFile(packageJsonPath, sort(await Fs.readFile(packageJsonPath, 'utf-8')));
}
