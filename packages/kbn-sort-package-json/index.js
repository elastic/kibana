/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sorter from 'sort-package-json';

/**
 * @param {string | Record<string, any>} json
 * @returns
 */
export function sortPackageJson(json) {
  return sorter(
    // always parse and stringify the json to make sure it's using 2 space indentation
    JSON.stringify(typeof json === 'string' ? JSON.parse(json) : json, null, 2),
    {
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
    }
  );
}
