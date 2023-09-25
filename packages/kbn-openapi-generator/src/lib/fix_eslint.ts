/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';

export async function fixEslint(path: string) {
  await execa('npx', ['eslint', '--fix', path], {
    // Need to run eslint from the Kibana root directory, otherwise it will not
    // be able to pick up the right config
    cwd: REPO_ROOT,
  });
}
