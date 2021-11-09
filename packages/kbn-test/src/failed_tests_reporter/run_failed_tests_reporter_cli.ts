/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { run, createFailError, createFlagError } from '@kbn/dev-utils';
import globby from 'globby';
import normalize from 'normalize-path';

import { getFailures, TestFailure } from './get_failures';
import { GithubApi, GithubIssueMini } from './github_api';
import { updateFailureIssue, createFailureIssue } from './report_failure';
import { getIssueMetadata } from './issue_metadata';
import { readTestReport } from './test_report';
import { addMessagesToReport } from './add_messages_to_report';
import { getReportMessageIter } from './report_metadata';
import { reportFailuresToEs } from './report_failures_to_es';
import { reportFailuresToFile } from './report_failures_to_file';

const DEFAULT_PATTERNS = [Path.resolve(REPO_ROOT, 'target/junit/**/*.xml')];

export function runFailedTestsReporterCli() {
  run(
    async ({ log, flags }) => {
      const indexInEs = flags['index-errors'];

      let updateGithub = flags['github-update'];
      if (updateGithub && !process.env.GITHUB_TOKEN) {
        throw createFailError(
          'GITHUB_TOKEN environment variable must be set, otherwise use --no-github-update flag'
        );
      }

      let branch: string = '';
      if (updateGithub) {
        let isPr = false;

        if (process.env.BUILDKITE === 'true') {
          branch = process.env.BUILDKITE_BRANCH || '';
          isPr = process.env.BUILDKITE_PULL_REQUEST === 'true';
          updateGithub = process.env.REPORT_FAILED_TESTS_TO_GITHUB === 'true';
        } else {
          // JOB_NAME is formatted as `elastic+kibana+7.x` in some places and `elastic+kibana+7.x/JOB=kibana-intake,node=immutable` in others
          const jobNameSplit = (process.env.JOB_NAME || '').split(/\+|\//);
          branch = jobNameSplit.length >= 3 ? jobNameSplit[2] : process.env.GIT_BRANCH || '';
          isPr = !!process.env.ghprbPullId;

          const isMainOrVersion = branch === 'main' || branch.match(/^\d+\.(x|\d+)$/);
          if (!isMainOrVersion || isPr) {
            log.info('Failure issues only created on main/version branch jobs');
            updateGithub = false;
          }
        }

        if (!branch) {
          throw createFailError(
            'Unable to determine originating branch from job name or other environment variables'
          );
        }
      }

      const githubApi = new GithubApi({
        log,
        token: process.env.GITHUB_TOKEN,
        dryRun: !updateGithub,
      });

      const buildUrl = flags['build-url'] || (updateGithub ? '' : 'http://buildUrl');
      if (typeof buildUrl !== 'string' || !buildUrl) {
        throw createFlagError('Missing --build-url or process.env.BUILD_URL');
      }

      const patterns = (flags._.length ? flags._ : DEFAULT_PATTERNS).map((p) =>
        normalize(Path.resolve(p))
      );
      log.info('Searching for reports at', patterns);
      const reportPaths = await globby(patterns, {
        absolute: true,
      });

      if (!reportPaths.length) {
        throw createFailError(`Unable to find any junit reports with patterns [${patterns}]`);
      }

      log.info('found', reportPaths.length, 'junit reports', reportPaths);
      const newlyCreatedIssues: Array<{
        failure: TestFailure;
        newIssue: GithubIssueMini;
      }> = [];

      for (const reportPath of reportPaths) {
        const report = await readTestReport(reportPath);
        const messages = Array.from(getReportMessageIter(report));
        const failures = await getFailures(report);

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

          let existingIssue: GithubIssueMini | undefined = await githubApi.findFailedTestIssue(
            (i) =>
              getIssueMetadata(i.body, 'test.class') === failure.classname &&
              getIssueMetadata(i.body, 'test.name') === failure.name
          );

          if (!existingIssue) {
            const newlyCreated = newlyCreatedIssues.find(
              ({ failure: f }) => f.classname === failure.classname && f.name === failure.name
            );

            if (newlyCreated) {
              existingIssue = newlyCreated.newIssue;
            }
          }

          if (existingIssue) {
            const newFailureCount = await updateFailureIssue(
              buildUrl,
              existingIssue,
              githubApi,
              branch
            );
            const url = existingIssue.html_url;
            failure.githubIssue = url;
            failure.failureCount = updateGithub ? newFailureCount : newFailureCount - 1;
            pushMessage(`Test has failed ${newFailureCount - 1} times on tracked branches: ${url}`);
            if (updateGithub) {
              pushMessage(`Updated existing issue: ${url} (fail count: ${newFailureCount})`);
            }
            continue;
          }

          const newIssue = await createFailureIssue(buildUrl, failure, githubApi, branch);
          pushMessage('Test has not failed recently on tracked branches');
          if (updateGithub) {
            pushMessage(`Created new issue: ${newIssue.html_url}`);
            failure.githubIssue = newIssue.html_url;
          }
          newlyCreatedIssues.push({ failure, newIssue });
          failure.failureCount = updateGithub ? 1 : 0;
        }

        // mutates report to include messages and writes updated report to disk
        await addMessagesToReport({
          report,
          messages,
          log,
          reportPath,
          dryRun: !flags['report-update'],
        });

        reportFailuresToFile(log, failures);
      }
    },
    {
      description: `a cli that opens issues or updates existing issues based on junit reports`,
      flags: {
        boolean: ['github-update', 'report-update'],
        string: ['build-url'],
        default: {
          'github-update': true,
          'report-update': true,
          'index-errors': true,
          'build-url': process.env.BUILD_URL,
        },
        help: `
          --no-github-update Execute the CLI without writing to Github
          --no-report-update Execute the CLI without writing to the JUnit reports
          --no-index-errors  Execute the CLI without indexing failures into Elasticsearch
          --build-url        URL of the failed build, defaults to process.env.BUILD_URL
        `,
      },
    }
  );
}
