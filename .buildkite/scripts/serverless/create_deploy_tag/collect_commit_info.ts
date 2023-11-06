/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COMMIT_INFO_CTX, exec } from './shared';
import {
  getCommitExtract,
  getCurrentQARelease,
  getSelectedCommitHash,
  hashToCommit,
  toCommitInfoHtml,
} from './info_sections/commit_info';
import {
  getArtifactBuildJob,
  getOnMergePRBuild,
  getQAFTestBuilds,
  toBuildkiteBuildInfoHtml,
} from './info_sections/build_info';
import {
  compareSOSnapshots,
  toSOComparisonBlockHtml,
} from './info_sections/so_snapshot_comparison';
import { getUsefulLinksHtml } from './info_sections/useful_links';

async function main() {
  const previousSha = await getCurrentQARelease();
  const selectedSha = getSelectedCommitHash();

  // Current commit info
  const previousCommit = await hashToCommit(previousSha);
  const previousCommitInfo = getCommitExtract(previousCommit);
  addBuildkiteInfoSection(toCommitInfoHtml('Current commit on QA:', previousCommitInfo));

  // Target commit info
  const selectedCommit = await hashToCommit(selectedSha);
  const selectedCommitInfo = getCommitExtract(selectedCommit);
  addBuildkiteInfoSection(toCommitInfoHtml('Target commit:', selectedCommitInfo));

  // Buildkite build info
  const buildkiteBuild = await getOnMergePRBuild(selectedSha);
  const qafBuilds = await getQAFTestBuilds(selectedCommitInfo.date!);
  const artifactBuild = await getArtifactBuildJob(selectedCommitInfo.date!, selectedSha);
  addBuildkiteInfoSection(
    toBuildkiteBuildInfoHtml('Relevant build info:', {
      'Merge build': buildkiteBuild,
      'QAF test build': qafBuilds[0],
      'Artifact container build': artifactBuild,
    })
  );

  // Save Object migration comparison
  const comparisonResult = compareSOSnapshots(previousSha, selectedSha);
  addBuildkiteInfoSection(toSOComparisonBlockHtml(comparisonResult));

  // Useful links
  addBuildkiteInfoSection(
    getUsefulLinksHtml('Useful links:', {
      previousCommitHash: previousSha,
      selectedCommitHash: selectedSha,
    })
  );
}

function addBuildkiteInfoSection(html: string) {
  exec(`buildkite-agent annotate --append --style 'info' --context '${COMMIT_INFO_CTX}'`, {
    input: html + '<br />',
  });
}

main()
  .then(() => {
    console.log('Commit-related information added.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    // When running locally, we can see what calls were made to execSync to debug
    if (!process.env.CI) {
      // @ts-ignore
      console.log(exec.calls);
    }
  });
