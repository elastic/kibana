/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import globby from 'globby';

export function findTestPluginPaths(dirs: string | string[]) {
  return (Array.isArray(dirs) ? dirs : [dirs])
    .flatMap((dir) =>
      globby.sync('*/kibana.jsonc', {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
      })
    )
    .map((p) => `--plugin-path=${Path.dirname(p)}`);
}
