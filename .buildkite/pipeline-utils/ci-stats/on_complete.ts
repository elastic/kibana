/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    // buildkite meta-data allows for 100kb of data, so we trim the report to that size, to unblock builds
    buildkite.setMetadata('pr_comment:ci_stats_report:body', trimToSize(report.md, 100000));

    const annotationType = report?.success ? 'info' : 'error';
    buildkite.setAnnotation('ci-stats-report', annotationType, report.md);
  }

  if (report && !report.success) {
    console.log('+++ CI Stats Report');
    console.error('Failing build due to CI Stats report. See annotation at top of build.');
    process.exit(1);
  }
}

function trimToSize(str: string, sizeLimit: number, totalCharsTrimmed = 0): string {
  const trimChunkSize = 500;
  const sizeInBytes = new Blob([str]).size;
  if (sizeInBytes <= sizeLimit) {
    if (totalCharsTrimmed > 0) {
      console.log(`Trimmed ${totalCharsTrimmed} characters from report.`);
      return `${str}... \n[trimmed ${totalCharsTrimmed} characters]`;
    } else {
      return str;
    }
  } else {
    if (trimChunkSize > str.length) {
      return trimToSize(str.slice(0, -trimChunkSize), sizeLimit, totalCharsTrimmed + trimChunkSize);
    } else {
      return `${str}... \n[trimmed ${totalCharsTrimmed} characters]`;
    }
  }
}
