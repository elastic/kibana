/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sorter from 'sort-package-json';

export function sortPackageJson(json: string) {
  return (
    JSON.stringify(
      sorter(JSON.parse(json), {
        // top level keys in the order they were written when this was implemented
        sortOrder: [
          'name',
          'description',
          'keywords',
          'private',
          'version',
          'branch',
          'main',
          'browser',
          'types',
          'tsdocMetadata',
          'build',
          'homepage',
          'bugs',
          'license',
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
