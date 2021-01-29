/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { run, createFailError, createFlagError } from '@kbn/dev-utils';
import globby from 'globby';

import { getFailures, TestFailure } from './get_failures';
import { GithubApi, GithubIssueMini } from './github_api';
import { updateFailureIssue, createFailureIssue } from './report_failure';
import { getIssueMetadata } from './issue_metadata';
import { readTestReport } from './test_report';
import { addMessagesToReport } from './add_messages_to_report';
import { getReportMessageIter } from './report_metadata';

const DEFAULT_PATTERNS = [Path.resolve(REPO_ROOT, 'target/junit/**/*.xml')];

const getBranch = () => {
  if (process.env.TEAMCITY_CI) {
    return (process.env.GIT_BRANCH || '').replace(/^refs\/heads\//, '');
  } else {
    // JOB_NAME is formatted as `elastic+kibana+7.x` in some places and `elastic+kibana+7.x/JOB=kibana-intake,node=immutable` in others
    const jobNameSplit = (process.env.JOB_NAME || '').split(/\+|\//);
    const branch = jobNameSplit.length >= 3 ? jobNameSplit[2] : process.env.GIT_BRANCH;
    return branch;
  }
};

export function runFailedTestsReporterCli() {
  run(
    async ({ log, flags }) => {
      let updateGithub = flags['github-update'];
      if (updateGithub && !process.env.GITHUB_TOKEN) {
        throw createFailError(
          'GITHUB_TOKEN environment variable must be set, otherwise use --no-github-update flag'
        );
      }

      if (updateGithub) {
        const branch = getBranch();
        if (!branch) {
          throw createFailError(
            'Unable to determine originating branch from job name or other environment variables'
          );
        }

        // ghprbPullId check can be removed once there are no PR jobs running on Jenkins
        const isPr = !!process.env.GITHUB_PR_NUMBER || !!process.env.ghprbPullId;
        const isMasterOrVersion = branch === 'master' || branch.match(/^\d+\.(x|\d+)$/);
        if (!isMasterOrVersion || isPr) {
          log.info('Failure issues only created on master/version branch jobs');
          updateGithub = false;
        }
      }

      const githubApi = new GithubApi({
        log,
        token: process.env.GITHUB_TOKEN,
        dryRun: !updateGithub,
      });

      const buildUrl = flags['build-url'] || (updateGithub ? '' : 'http://buildUrl');
      if (typeof buildUrl !== 'string' || !buildUrl) {
        throw createFlagError(
          'Missing --build-url, process.env.TEAMCITY_BUILD_URL, or process.env.BUILD_URL'
        );
      }

      const patterns = flags._.length ? flags._ : DEFAULT_PATTERNS;
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

        for (const failure of await getFailures(report)) {
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
            const newFailureCount = await updateFailureIssue(buildUrl, existingIssue, githubApi);
            const url = existingIssue.html_url;
            pushMessage(`Test has failed ${newFailureCount - 1} times on tracked branches: ${url}`);
            if (updateGithub) {
              pushMessage(`Updated existing issue: ${url} (fail count: ${newFailureCount})`);
            }
            continue;
          }

          const newIssue = await createFailureIssue(buildUrl, failure, githubApi);
          pushMessage('Test has not failed recently on tracked branches');
          if (updateGithub) {
            pushMessage(`Created new issue: ${newIssue.html_url}`);
          }
          newlyCreatedIssues.push({ failure, newIssue });
        }

        // mutates report to include messages and writes updated report to disk
        await addMessagesToReport({
          report,
          messages,
          log,
          reportPath,
          dryRun: !flags['report-update'],
        });
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
          'build-url': process.env.TEAMCITY_BUILD_URL || process.env.BUILD_URL,
        },
        help: `
          --no-github-update Execute the CLI without writing to Github
          --no-report-update Execute the CLI without writing to the JUnit reports
          --build-url        URL of the failed build, defaults to process.env.TEAMCITY_BUILD_URL or process.env.BUILD_URL
        `,
      },
    }
  );
}
