/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { REPO_ROOT, run, createFailError, createFlagError } from '@kbn/dev-utils';
import globby from 'globby';

import { getFailures } from './get_failures';
import { GithubApi } from './github_api';
import { updatedFailureIssue, createFailureIssue } from './report_failure';
import { getIssueMetadata } from './issue_metadata';

export function runFailedTestsReporterCli() {
  run(
    async ({ log, flags }) => {
      const buildUrl = flags['build-url'];
      if (typeof buildUrl !== 'string') {
        throw createFlagError('Missing --build-url or process.env.BUILD_URL');
      }

      const dryRun = !!flags['dry-run'];
      if (!dryRun) {
        // JOB_NAME is formatted as `elastic+kibana+7.x` in some places and `elastic+kibana+7.x/JOB=kibana-intake,node=immutable` in others
        const jobNameSplit = (process.env.JOB_NAME || '').split(/\+|\//);
        const branch = jobNameSplit.length >= 3 ? jobNameSplit[2] : process.env.GIT_BRANCH;
        if (!branch) {
          throw createFailError(
            'Unable to determine originating branch from job name or other environment variables'
          );
        }

        const isPr = !!process.env.ghprbPullId;
        const isMasterOrVersion =
          branch.match(/^(origin\/){0,1}master$/) || branch.match(/^(origin\/){0,1}\d+\.(x|\d+)$/);
        if (!isMasterOrVersion || isPr) {
          throw createFailError('Failure issues only created on master/version branch jobs', {
            exitCode: 0,
          });
        }

        if (!process.env.GITHUB_TOKEN) {
          throw createFailError(
            'GITHUB_TOKEN environment variable must be set, otherwise use --dry-run flag'
          );
        }
      }

      const githubApi = new GithubApi(log, dryRun ? undefined : process.env.GITHUB_TOKEN);
      const issues = await githubApi.getKibanaIssues();
      const reportPaths = await globby(['target/junit/**/*.xml'], {
        cwd: REPO_ROOT,
        absolute: true,
      });

      for (const reportPath of reportPaths) {
        for (const failure of await getFailures(log, reportPath)) {
          const existingIssue = issues.find(
            i =>
              getIssueMetadata(i.body, 'test.class') === failure.classname &&
              getIssueMetadata(i.body, 'test.name') === failure.name
          );

          if (existingIssue) {
            await updatedFailureIssue(buildUrl, existingIssue, log, githubApi);
          } else {
            await createFailureIssue(buildUrl, failure, log, githubApi);
          }
        }
      }
    },
    {
      description: `a cli that opens issues or updates existing issues based on junit reports`,
      flags: {
        boolean: ['dry-run'],
        string: ['build-url'],
        default: {
          'build-url': process.env.BUILD_URL,
        },
        help: `
          --dry-run          Execute the CLI without contacting Github
          --build-url        URL of the failed build, defaults to process.env.BUILD_URL
        `,
      },
    }
  );
}
