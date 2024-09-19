/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-utils';

import { PROJECTS } from './projects';

run(async ({ log }) => {
  for (const project of PROJECTS) {
    if (!project.config.compilerOptions?.composite) {
      log.info(project.tsConfigPath);
    }
  }
});
