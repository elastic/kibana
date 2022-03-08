/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';

import sorter from 'sort-package-json';

import { Kibana } from './kibana';

export async function sortPackageJson(kbn: Kibana) {
  const packageJsonPath = kbn.getAbsolute('package.json');
  const packageJson = await Fs.readFile(packageJsonPath, 'utf-8');
  await Fs.writeFile(
    packageJsonPath,
    JSON.stringify(
      sorter(JSON.parse(packageJson), {
        // top level keys in the order they were written when this was implemented
        sortOrder: [
          'name',
          'description',
          'keywords',
          'private',
          'version',
          'branch',
          'types',
          'tsdocMetadata',
          'build',
          'homepage',
          'bugs',
          'kibana',
          'author',
          'scripts',
          'repository',
          'engines',
          'resolutions',
        ],
      }),
      null,
      2
    ) + '\n'
  );
}
