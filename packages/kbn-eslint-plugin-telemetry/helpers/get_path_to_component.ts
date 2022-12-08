/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';

const XPACK_DIR_ROOT = '/x-pack/';

const FILTERED_DIRECTORY_NAMES = ['plugins', 'public', 'pages', 'components', 'server', 'utils'];

export function getPathToComponent(fileName: string, cwd: string) {
  const { dir } = path.parse(fileName);
  const relativePathToFile = dir.replace(cwd, '');

  return relativePathToFile.includes(XPACK_DIR_ROOT)
    ? relativePathToFile
        .split(XPACK_DIR_ROOT)[1]
        .split('/')
        .reduce((acc, curr, index, arr) => {
          if (curr === 'observability') {
            return 'o11y|';
          }

          if (index === 0) {
            return `${curr}|`;
          }

          const dirName = !FILTERED_DIRECTORY_NAMES.includes(curr)
            ? `${curr}${index < arr.length - 2 ? '.' : ''}`
            : '';

          return dirName ? `${acc}${dirName}` : acc;
        }, '')
    : '';
}
