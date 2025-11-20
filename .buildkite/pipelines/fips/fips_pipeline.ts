/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { load as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BuildkiteClient } from '#pipeline-utils';
import type { BuildkiteCommandStep } from '#pipeline-utils';

(async () => {
  const bk = new BuildkiteClient();

  try {
    const pipelineYml = loadYaml(
      readFileSync(resolve(__dirname, './fips-temp.yml'), 'utf8')
    ) as BuildkiteCommandStep[];

    bk.uploadSteps(pipelineYml);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
