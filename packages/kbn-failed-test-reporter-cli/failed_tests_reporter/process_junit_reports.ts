/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addMessagesToReport } from './add_messages_to_report';
import { getFailures } from './get_failures';
import type { ProcessReportsParams } from './process_reports_types';
import { createFailureIssue, updateFailureIssue } from './report_failure';
import { reportFailuresToEs } from './report_failures_to_es';
import { reportFailuresToFile } from './report_failures_to_file';
import { getReportMessageIter } from './report_metadata';
import { getRootMetadata, readTestReport } from './test_report';

export async function processJUnitReports(
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
    reportUpdate,
    bkMeta,
  } = params;

  for (const reportPath of reportPaths) {
    const report = await readTestReport(reportPath);
    const messages = Array.from(getReportMessageIter(report));
    const failures = getFailures(report);

    await existingIssues.loadForFailures(failures);

    if (indexInEs) {
      await reportFailuresToEs(log, failures);
    }

    for (const failure of failures) {
      const pushMessage = (msg: string) => {
        messages.push({
          classname: failure.classname,
          name: failure.name,
          message: msg,
        });
      };

      if (failure.likelyIrrelevant) {
        pushMessage(
          'Failure is likely irrelevant' +
            (updateGithub ? ', so an issue was not created or updated' : '')
        );
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
        pushMessage(`Test has failed ${newCount - 1} times on tracked branches: ${url}`);
        if (updateGithub) {
          pushMessage(`Updated existing issue: ${url} (fail count: ${newCount})`);
        }
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
      pushMessage('Test has not failed recently on tracked branches');
      if (updateGithub) {
        pushMessage(`Created new issue: ${newIssue.html_url}`);
        failure.githubIssue = newIssue.html_url;
      }
      failure.failureCount = updateGithub ? 1 : 0;
    }

    // mutates report to include messages and writes updated report to disk
    await addMessagesToReport({
      report,
      messages,
      log,
      reportPath,
      dryRun: !reportUpdate,
    });

    await reportFailuresToFile(log, failures, bkMeta, getRootMetadata(report));
  }
}
