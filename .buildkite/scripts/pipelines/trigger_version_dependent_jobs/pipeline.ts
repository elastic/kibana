#!/usr/bin/env ts-node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getVersionsFile, BuildkiteTriggerStep } from '#pipeline-utils';

const pipelineSets = {
  'es-forward': 'kibana-es-forward-compatibility-testing',
  'artifacts-snapshot': 'kibana-artifacts-snapshot',
  'artifacts-staging': 'kibana-artifacts-staging',
  'artifacts-trigger': 'kibana-artifacts-trigger',
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
    case 'artifacts-trigger': {
      pipelineSteps.push(...getArtifactBuildTriggers());
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
export function getESForwardPipelineTriggers(): BuildkiteTriggerStep[] {
  const versions = getVersionsFile();
  const kibanaPrevMajor = versions.prevMajors[0];
  const targetESVersions = [versions.prevMinors, versions.current].flat();

  return targetESVersions.map(({ version }) => {
    return {
      trigger: pipelineSets['es-forward'],
      async: true,
      label: `Triggering Kibana ${kibanaPrevMajor.version} + ES ${version} forward compatibility`,
      build: {
        message: process.env.MESSAGE || `ES forward-compatibility test for ES ${version}`,
        branch: kibanaPrevMajor.branch,
        commit: 'HEAD',
        env: {
          ES_SNAPSHOT_MANIFEST: `https://storage.googleapis.com/kibana-ci-es-snapshots-daily/${version}/manifest-latest-verified.json`,
          DRY_RUN: process.env.DRY_RUN,
        },
      },
    } as BuildkiteTriggerStep;
  });
}

/**
 * This pipeline creates Kibana artifact snapshots for all open branches.
 * Should be triggered for all open branches in the versions.json: 7.x, 8.x
 */
export function getArtifactSnapshotPipelineTriggers() {
  // Trigger for all named branches
  const versions = getVersionsFile();
  const targetVersions = [versions.prevMajors, versions.prevMinors, versions.current].flat();

  return targetVersions.map(({ branch }) => {
    return {
      trigger: pipelineSets['artifacts-snapshot'],
      async: true,
      label: `Triggering snapshot artifact builds for ${branch}`,
      build: {
        message: process.env.MESSAGE || `Snapshot artifact build for ${branch}`,
        branch,
        commit: 'HEAD',
        env: {
          DRY_RUN: process.env.DRY_RUN,
        },
      },
    } as BuildkiteTriggerStep;
  });
}

/**
 * This pipeline creates Kibana artifacts for branches that are not the current main.
 * Should be triggered for all open branches in the versions.json: 7.x, 8.x, but not main.
 */
export function getArtifactStagingPipelineTriggers() {
  // Trigger for all branches, that are not current minor+major
  const versions = getVersionsFile();
  const targetVersions = [versions.prevMajors, versions.prevMinors].flat();

  return targetVersions.map(({ branch }) => {
    return {
      trigger: pipelineSets['artifacts-staging'],
      async: true,
      label: `Triggering staging artifact builds for ${branch}`,
      build: {
        message: process.env.MESSAGE || `Staging artifact build for ${branch}`,
        branch,
        commit: 'HEAD',
        env: {
          DRY_RUN: process.env.DRY_RUN,
        },
      },
    } as BuildkiteTriggerStep;
  });
}

/**
 * This pipeline checks if there are any changes in the incorporated $BEATS_MANIFEST_LATEST_URL (beats version)
 * and triggers a staging artifact build.
 * Should be triggered only for the active minor versions that are not `main` and not `7.17`.
 *
 * TODO: we could basically do the check logic of .buildkite/scripts/steps/artifacts/trigger.sh in here, and remove kibana-artifacts-trigger
 */
export function getArtifactBuildTriggers() {
  const versions = getVersionsFile();
  const targetVersions = versions.prevMinors;

  return targetVersions.map(
    ({ branch }) =>
      ({
        trigger: pipelineSets['artifacts-trigger'],
        async: true,
        label: `Triggering artifact build for ${branch}`,
        build: {
          message: process.env.MESSAGE || `Artifact build for ${branch}`,
          branch,
          commit: 'HEAD',
          env: {
            DRY_RUN: process.env.DRY_RUN,
          },
        },
      } as BuildkiteTriggerStep)
  );
}

function emitPipeline(pipelineSteps: BuildkiteTriggerStep[]) {
  console.log(JSON.stringify(pipelineSteps, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
