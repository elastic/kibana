/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';

import { TS_CONFIG_FILES } from './paths';

export const deoptimize = async () => {
  for (const filename of TS_CONFIG_FILES) {
    await execa('git', ['update-index', '--no-skip-worktree', filename]);
    await execa('git', ['checkout', filename]);
  }
};
