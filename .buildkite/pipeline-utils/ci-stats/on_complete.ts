/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from '../buildkite';
import { CiStatsClient } from './client';

const buildkite = new BuildkiteClient();
const ciStats = new CiStatsClient();

export async function onComplete() {
  if (!process.env.CI_STATS_BUILD_ID) {
    return;
  }

  const result = buildkite.getBuildStatus(await buildkite.getCurrentBuild());
  const status = result.success ? 'SUCCESS' : 'FAILURE';
  console.log('Job Status:', result);
  await ciStats.completeBuild(status, process.env.CI_STATS_BUILD_ID);

  if (!process.env.GITHUB_PR_NUMBER) {
    return;
  }

  const report = await ciStats.getPrReport(process.env.CI_STATS_BUILD_ID);
  if (report?.md) {
    // buildkite has a metadata size limit of 100kb, so we only add this, if it's small enough
    if (new Blob([report.md]).size < 100000) {
      buildkite.setMetadata('pr_comment:ci_stats_report:body', report.md);
    } else {
      buildkite.setMetadata(
        'pr_comment:ci_stats_report:body',
        'The CI Stats report is too large to be displayed here, check out the CI build annotation for this information.'
      );
    }

    const annotationType = report?.success ? 'info' : 'error';
    buildkite.setAnnotation('ci-stats-report', annotationType, report.md);
  }

  if (report && !report.success) {
    console.log('+++ CI Stats Report');
    console.error('Failing build due to CI Stats report. See annotation at top of build.');
    process.exit(1);
  }
}
