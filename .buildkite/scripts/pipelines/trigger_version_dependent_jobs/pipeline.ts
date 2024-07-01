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
  'artifacts-snapshot': 'kibana-artifacts-snapshot',
  'artifacts-staging': 'kibana-artifacts-staging',
};

/**
 * This pipeline is used to emit trigger steps onto different pipelines, based on dynamic parameters retrieved from the repository.
 */
async function main() {
  const pipelineSetNames = Object.keys(pipelineSets);
  const pipelineSetName: string | undefined = process.env.TRIGGER_PIPELINE_SET;
  const pipelineSteps: BuildkiteTriggerStep[] = [];

  if (!pipelineSetName) {
    throw new Error(
      `Env var TRIGGER_PIPELINE_SET is required, and can be one of: ${pipelineSetNames}`
    );
  } else if (!pipelineSetNames.includes(pipelineSetName)) {
    throw new Error(
      `Invalid value for TRIGGER_PIPELINE_SET (${pipelineSetName}), can be one of: ${pipelineSetNames}`
    );
  }

  switch (pipelineSetName) {
    case 'es-forward': {
      pipelineSteps.push(...getESForwardPipelineTriggers());
      break;
    }
    case 'artifacts-snapshot': {
      pipelineSteps.push(...getArtifactSnapshotPipelineTriggers());
      break;
    }
    case 'artifacts-staging': {
      pipelineSteps.push(...getArtifactStagingPipelineTriggers());
      break;
    }
    default: {
      throw new Error(`Unknown pipeline set: ${pipelineSetName}`);
    }
  }

  emitPipeline(pipelineSteps);
}

/**
 * This pipeline is testing the forward compatibility of Kibana with different versions of Elasticsearch.
 * Should be triggered for combinations of (Kibana@7.17 + ES@8.x {current open branches on the same major})
 */
function getESForwardPipelineTriggers(): BuildkiteTriggerStep[] {
  const versions = getVersionsFile();
  const kibanaPrevMajor = versions.find((v) => v.previousMajor)?.branch;
  const targetESVersions = versions.filter((v) => v.currentMajor).map((v) => v.version);

  return targetESVersions.map((version) => {
    return {
      trigger: 'kibana-es-forward',
      async: true,
      label: `Triggering Kibana ${kibanaPrevMajor} + ES ${version} forward compatibility`,
      build: {
        message: process.env.MESSAGE || `ES forward-compatibility test for ES ${version}`,
        branch: kibanaPrevMajor,
        commit: 'HEAD',
        env: {
          ES_SNAPSHOT_MANIFEST: `https://storage.googleapis.com/kibana-ci-es-snapshots-daily/${version}/manifest-latest-verified.json`,
        },
      },
    } as BuildkiteTriggerStep;
  });
}

/**
 * This pipeline creates Kibana artifact snapshots for all open branches.
 * Should be triggered for all open branches in the versions.json: 7.x, 8.x
 */
function getArtifactSnapshotPipelineTriggers() {
  // Trigger for all named branches
  const versions = getVersionsFile();
  const branches = versions.map((v) => v.branch);

  return branches.map((branch) => {
    return {
      trigger: 'kibana-artifacts-snapshot',
      async: true,
      label: `Triggering snapshot artifact builds for ${branch}`,
      build: {
        message: process.env.MESSAGE || `Snapshot artifact build for ${branch}`,
        branch,
        commit: 'HEAD',
      },
    } as BuildkiteTriggerStep;
  });
}

/**
 * This pipeline creates Kibana artifacts for branches that are not the current main.
 * Should be triggered for all open branches in the versions.json: 7.x, 8.x, but not main.
 */
function getArtifactStagingPipelineTriggers() {
  // Trigger for all branches, that are not current minor+major
  const versions = getVersionsFile();
  const branches = versions.filter((v) => !v.currentMajor && !v.currentMinor).map((v) => v.branch);

  return branches.map((branch) => {
    return {
      trigger: 'kibana-artifacts-staging',
      async: true,
      label: `Triggering staging artifact builds for ${branch}`,
      build: {
        message: process.env.MESSAGE || `Staging artifact build for ${branch}`,
        branch,
        commit: 'HEAD',
      },
    } as BuildkiteTriggerStep;
  });
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
