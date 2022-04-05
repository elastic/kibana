/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';

import { getFileHash, write, GlobalTask } from '../lib';

export const WriteShaSums: GlobalTask = {
  global: true,
  description: 'Writing sha1sums of archives and packages in target directory',

  async run(config) {
    const artifacts = await globby(['*.zip', '*.tar.gz', '*.deb', '*.rpm'], {
      cwd: config.resolveFromTarget('.'),
      absolute: true,
    });

    for (const artifact of artifacts) {
      await write(`${artifact}.sha512.txt`, `${await getFileHash(artifact, 'sha512')} ${artifact}`);
    }
  },
};
