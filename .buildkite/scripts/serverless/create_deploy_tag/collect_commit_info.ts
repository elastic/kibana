/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exec } from './shared';
import {
  getCommitExtract,
  getCurrentQARelease,
  getSelectedCommitHash,
  hashToCommit,
  toCommitInfoHtml,
} from './info_sections/release_info';
import {
  getOnMergePRBuild,
  getQAFTestBuilds,
  toBuildkiteBuildInfoHtml,
} from './info_sections/build_info';
import {
  compareSOSnapshots,
  toSOComparisonBlockHtml,
} from './info_sections/so_snapshot_comparison';

async function main() {
  // Current commit info
  const previousSha = await getCurrentQARelease();
  const previousCommit = await hashToCommit(previousSha);
  const previousCommitInfo = getCommitExtract(previousCommit);
  await addBuildkiteInfoSection(toCommitInfoHtml('Current commit:', previousCommitInfo));

  // Target commit info
  const selectedSha = getSelectedCommitHash();
  const selectedCommit = await hashToCommit(selectedSha);
  const selectedCommitInfo = getCommitExtract(selectedCommit);
  await addBuildkiteInfoSection(toCommitInfoHtml('Target commit:', selectedCommitInfo));

  // Buildkite build info
  const buildkiteBuild = await getOnMergePRBuild(selectedSha);
  await addBuildkiteInfoSection(toBuildkiteBuildInfoHtml('Merge build', buildkiteBuild));
  const qafBuilds = await getQAFTestBuilds(selectedCommitInfo.date!);
  for (const build of qafBuilds) {
    if (build) {
      await addBuildkiteInfoSection(toBuildkiteBuildInfoHtml('QAF test', build));
    }
  }

  // Save Object migration comparison
  const comparisonResult = compareSOSnapshots(previousSha, selectedSha);
  await addBuildkiteInfoSection(toSOComparisonBlockHtml(comparisonResult));
}

async function addBuildkiteInfoSection(html: string) {
  exec(`buildkite-agent annotate --append --style 'info' --context 'commit-info'`, {
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
