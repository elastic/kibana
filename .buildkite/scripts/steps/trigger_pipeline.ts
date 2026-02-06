/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildkiteTriggerBuildParams } from '#pipeline-utils';
import { BuildkiteClient } from '#pipeline-utils';

const pipelineSlug = process.argv[2];
const branch = process.argv[3] || 'main';
const commit = process.argv[4] || 'HEAD';
const kibanaBuildId = process.argv[5] || '';
// key=value pairs in space separated string
const extraEnvVariables = process.argv[6] || '';
const includeBuildkitePrVars = process.argv[7] === 'true' || process.argv[7] === '1';

(async () => {
  try {
    const client = new BuildkiteClient();

    const buildkitePrVars: Partial<BuildkiteTriggerBuildParams> = {};
    if (includeBuildkitePrVars) {
      buildkitePrVars.pull_request_id = process.env.BUILDKITE_PULL_REQUEST;
      buildkitePrVars.pull_request_base_branch = process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH;
      buildkitePrVars.pull_request_repository = process.env.BUILDKITE_PULL_REQUEST_REPO;
    }

    const build = await client.triggerBuild(pipelineSlug, {
      commit,
      branch,
      env: {
        ...(kibanaBuildId && { KIBANA_BUILD_ID: kibanaBuildId }),
        ...extraEnvVariables.split(' ').reduce<Record<string, string>>((acc, varString) => {
          const [key, value] = varString.split('=');
          acc[key] = value;
          return acc;
        }, {}),
      },
      ignore_pipeline_branch_filters: true, // Required because of a Buildkite bug
      ...buildkitePrVars,
    });
    console.log(`Triggered build: ${build.web_url}`);
    process.exit(0);
  } catch (ex) {
    console.error('Buildkite API Error', ex.toString());
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
