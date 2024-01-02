/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import fs from 'fs';

const getPipeline = (filename: string, removeSteps = true) => {
  const str = fs.readFileSync(filename).toString();
  return removeSteps ? str.replace(/^steps:/, '') : str;
};

const uploadPipeline = (pipelineContent: string | object) => {
  const str =
    typeof pipelineContent === 'string' ? pipelineContent : JSON.stringify(pipelineContent);

  execSync('buildkite-agent pipeline upload', {
    input: str,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
};

(async () => {
  try {
    const pipeline = [];

    pipeline.push(
      getPipeline('.buildkite/pipelines/security_solution/security_solution_cypress.yml', false)
    );
    // remove duplicated steps
    uploadPipeline([...new Set(pipeline)].join('\n'));
  } catch (ex) {
    console.error('PR pipeline generation error', ex.message);
    process.exit(1);
  }
})();
