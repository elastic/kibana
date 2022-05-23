/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FTR_CONFIGS_MANIFEST_PATHS } from '@kbn/test';
import { readFileSync } from 'fs';

// This isn't meant to be 100% accurate at identifying new config files
// But it should catch /most/ of them with no false positives
// As of writing, when run against every file in the repo, it identifies about 90% of FTR configs with 0 false positives.
export function checkPossibleNewFtrConfig(newFiles, ftrConfigs = FTR_CONFIGS_MANIFEST_PATHS) {
  const possibleConfigs = newFiles
    .filter(({ path }) => {
      if (!path.match(/(test|e2e).*config[^\/]*\.(t|j)s$/)) {
        return false;
      }

      if (path.match(/\/__(fixtures|tests)__\//)) {
        return false;
      }

      if (path.match(/\.test\.(t|j)s$/)) {
        return false;
      }

      if (path.match(/\/common\/config.(t|j)s$/)) {
        return false;
      }

      return readFileSync(path)
        .toString()
        .match(/(testRunner)|(testFiles)/);
    })
    .map(({ relativePath }) => relativePath);

  for (const config of possibleConfigs) {
    if (!ftrConfigs.includes(config)) {
      throw new Error(
        `${config} looks like a new FTR config. Please add it to .buildkite/ftr_configs.yml. If it's not a new FTR config, please contact #kibana-operations`
      );
    }
  }
}
