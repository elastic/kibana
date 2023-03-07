/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { PackageRule } from '@kbn/repo-linter';
import { SetMap } from '@kbn/set-map';

export const noBasenameCollisionsRule = PackageRule.create('noBasenameCollisions', {
  async check() {
    const groupedByBasename = new SetMap<string, string>();

    for (const file of this.getAllFiles()) {
      if (!file.isJsTsCode()) {
        continue;
      }

      const repoRelWithoutExt = Path.resolve(
        file.repoRelDir,
        Path.basename(file.repoRel, file.ext)
      );

      groupedByBasename.add(repoRelWithoutExt, file.repoRel);
    }

    for (const [, paths] of groupedByBasename) {
      if (paths.size > 1) {
        const list = Array.from(paths, (p) => `\n  - ${p}`).join('');
        this.err(
          `Having two JS/TS files with the same name but different extensions is not allowed:${list}`
        );
      }
    }
  },
});
