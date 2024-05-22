#!/usr/bin/env ts-node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import { getKibanaDir, BuildkiteTriggerStep } from '#pipeline-utils';

function emitPipeline(pipelineSteps: BuildkiteTriggerStep[]) {
  console.log(JSON.stringify(pipelineSteps, null, 2));
}

const pipelineSets = {
  'es-forward': 'kibana-es-forward',
};

/**
 * This pipeline is used to emit trigger steps onto different pipelines, based on dynamic parameters retrieved from the repository.
 */
async function main() {
  const pipelineSetNames = Object.keys(pipelineSets);
  const pipelineSetName: string | undefined = process.env.TRIGGER_PIPELINE_SET;
  const pipelineSteps: BuildkiteTriggerStep[] = [];

  if (!isValidPipelineSet(pipelineSetName)) {
    throw new Error(
      `Env var TRIGGER_PIPELINE_SET is required, and can be one of: ${pipelineSetNames}`
    );
  }

  switch (pipelineSetName) {
    case 'es-forward': {
      pipelineSteps.push(...getESForwardPipelineTriggers());
      break;
    }
    default: {
      throw new Error(`Unknown pipeline set: ${pipelineSetName}`);
    }
  }

  emitPipeline(pipelineSteps);
}

function getESForwardPipelineTriggers(): BuildkiteTriggerStep[] {
  const versions = getVersionsFile();
  const prevMajorBranch = versions.find((v) => v.previousMajor)?.branch;
  const targetESVersions = versions
    .filter((v) => {
      return v.currentMajor && (v.currentMinor || v.previousMinor);
    })
    .map((v) => v.version);

  return targetESVersions.map((version) => {
    return {
      trigger: 'kibana-es-forward',
      async: true,
      label: `ES ${version} forward compatibility`,
      build: {
        message: `Triggering es-forward-compatibility test for ES ${version}`,
        branch: prevMajorBranch,
        commit: 'HEAD',
        env: {
          ES_SNAPSHOT_MANIFEST: `https://storage.googleapis.com/kibana-ci-es-snapshots-daily/${version}/manifest-latest-verified.json`,
        },
      },
    } as BuildkiteTriggerStep;
  });
}

function isValidPipelineSet(
  pipelineSetName: string | undefined
): pipelineSetName is keyof typeof pipelineSets {
  if (!pipelineSetName) {
    return false;
  } else {
    return Object.keys(pipelineSets).includes(pipelineSetName);
  }
}

function getVersionsFile(): Array<{
  version: string;
  branch: string;
  previousMajor?: boolean;
  previousMinor?: boolean;
  currentMajor?: boolean;
  currentMinor?: boolean;
}> {
  try {
    const versions = JSON.parse(
      fs.readFileSync(path.join(getKibanaDir(), 'versions.json')).toString()
    );
    return versions.versions;
  } catch (error) {
    throw new Error(`Failed to read versions.json: ${error}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
