/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getScoutFailures, type ScoutTestFailureExtended } from './get_scout_failures';
import type { ProcessReportsParams } from './process_reports_types';
import { createFailureIssue, updateFailureIssue } from './report_failure';
import { reportFailuresToEs } from './report_failures_to_es';
import { reportFailuresToFile } from './report_failures_to_file';

export async function processScoutReports(
  reportPaths: string[],
  params: ProcessReportsParams
): Promise<void> {
  const {
    log,
    existingIssues,
    buildUrl,
    githubApi,
    branch,
    pipeline,
    prependTitle,
    updateGithub,
    indexInEs,
    bkMeta,
  } = params;

  for (const reportPath of reportPaths) {
    log.info('Processing Scout report:', reportPath);
    const failures: ScoutTestFailureExtended[] = await getScoutFailures(reportPath);

    if (failures.length === 0) {
      log.info('No Scout failures found in:', reportPath);
      continue;
    }

    log.info('Found', failures.length, 'Scout failures in:', reportPath);

    await existingIssues.loadForFailures(failures);

    if (indexInEs) {
      await reportFailuresToEs(log, failures);
    }

    for (const failure of failures) {
      if (failure.likelyIrrelevant) {
        log.info(`Scout failure is likely irrelevant: ${failure.classname} - ${failure.name}`);
        continue;
      }

      const existingIssue = existingIssues.getForFailure(failure);
      if (existingIssue) {
        const { newBody, newCount } = await updateFailureIssue(
          buildUrl,
          existingIssue,
          githubApi,
          branch,
          pipeline,
          failure
        );
        const url = existingIssue.github.htmlUrl;
        existingIssue.github.body = newBody;
        failure.githubIssue = url;
        failure.failureCount = updateGithub ? newCount : newCount - 1;
        log.info(`Updated existing Scout issue: ${url} (fail count: ${newCount})`);
        continue;
      }

      const newIssue = await createFailureIssue(
        buildUrl,
        failure,
        githubApi,
        branch,
        pipeline,
        prependTitle
      );
      existingIssues.addNewlyCreated(failure, newIssue);
      if (updateGithub) {
        log.info(`Created new Scout issue: ${newIssue.html_url}`);
        failure.githubIssue = newIssue.html_url;
      }
      failure.failureCount = updateGithub ? 1 : 0;
    }

    // Generate Scout failure artifacts (similar to JUnit report processing)
    await reportFailuresToFile(log, failures, bkMeta, {});
  }
}
