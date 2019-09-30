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

import { REPO_ROOT, run, createFailError } from '@kbn/dev-utils';
import globby from 'globby';
import dedent from 'dedent';

import { getFailures } from './get_failures';
import { GithubApi } from './github_api';
import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';

const GITHUB_FLAKY_TEST_LABEL = 'failed-test';
const BUILD_URL = process.env.BUILD_URL;

export function runFailedTestsReporterCli() {
  run(
    async ({ log, flags }) => {
      if (!flags['dry-run']) {
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
      }

      const githubApi = new GithubApi(log, flags['dry-run'] as boolean, process.env.GITHUB_TOKEN);
      const issues = await githubApi.getKibanaIssues();
      const files = await globby(['target/junit/**/*.xml'], { cwd: REPO_ROOT, absolute: true });

      for (const file of files) {
        for (const failure of await getFailures(log, file)) {
          const existingIssue = issues.find(
            i =>
              getIssueMetadata(i.body, 'test.class') === failure.classname &&
              getIssueMetadata(i.body, 'test.name') === failure.name
          );

          if (existingIssue) {
            // Increment failCount
            const newCount = getIssueMetadata(existingIssue.body, 'test.failCount', 0) + 1;
            const newBody = updateIssueMetadata(existingIssue.body, {
              'test.failCount': newCount,
            });

            await githubApi.editIssueBody(existingIssue.number, newBody);
            await githubApi.addIssueComment(
              existingIssue.number,
              `New failure: [Jenkins Build](${BUILD_URL})`
            );

            log.info(`Updated issue ${existingIssue.html_url}, failCount: ${newCount}`);
          } else {
            const title = `Failing test: ${failure.classname} - ${failure.name}`;
            const body = updateIssueMetadata(
              dedent`
                A test failed on a tracked branch
                \`\`\`
                ${failure.failure}
                \`\`\`
                First failure: [Jenkins Build](${BUILD_URL})
              `,
              {
                'test.class': failure.classname,
                'test.name': failure.name,
                'test.failCount': 1,
              }
            );

            const newIssueUrl = await githubApi.createIssue(title, body, [GITHUB_FLAKY_TEST_LABEL]);
            log.info(`Created issue ${newIssueUrl}`);
          }
        }
      }
    },
    {
      description: `a cli that opens issues or updates existing issues based on junit reports`,
      flags: {
        boolean: ['dry-run'],
        help: `
          --dry-run          Execute the CLI without contacting Github
        `,
      },
    }
  );
}
