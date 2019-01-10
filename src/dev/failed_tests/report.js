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

import xml2js from 'xml2js';
import vfs from 'vinyl-fs';
import { createMapStream } from '../../utils/streams';
import { getGithubClient, markdownMetadata, paginate } from '../github_utils';
import { find } from 'lodash';
import stripAnsi from 'strip-ansi';

const GITHUB_FLAKY_TEST_LABEL = 'failed-test';
const GITHUB_OWNER = 'elastic';
const GITHUB_REPO = 'kibana';
const BUILD_URL = process.env.BUILD_URL;

/**
 * Parses junit XML files into JSON
 */
const mapXml = createMapStream((file) => new Promise((resolve, reject) => {
  xml2js.parseString(file.contents.toString(), (err, result) => {
    if (err) {
      return reject(err);
    }
    resolve(result);
  });
}));

/**
 * Filters all testsuites to find failed testcases
 */
const filterFailures = createMapStream((testSuite) => {
  // Grab the failures. Reporters may report multiple testsuites in a single file.
  const testFiles = testSuite.testsuites
    ? testSuite.testsuites.testsuite
    : [testSuite.testsuite];

  const failures = testFiles.reduce((failures, testFile) => {
    for (const testCase of testFile.testcase) {
      if (testCase.failure) {
        // unwrap xml weirdness
        failures.push({
          ...testCase.$,
          // Strip ANSI color characters
          failure: stripAnsi(testCase.failure[0])
        });
      }
    }

    return failures;
  }, []);

  console.log(`Found ${failures.length} test failures`);

  return failures;
});

/**
 * Creates and updates github issues for the given testcase failures.
 */
const updateGithubIssues = (githubClient, issues) => {
  return createMapStream(async (failureCases) => {

    await Promise.all(failureCases.map(async (failureCase) => {
      const existingIssue = find(issues, (issue) => {
        return markdownMetadata.get(issue.body, 'test.class') === failureCase.classname &&
          markdownMetadata.get(issue.body, 'test.name') === failureCase.name;
      });

      if (existingIssue) {
        // Increment failCount
        const newCount = (markdownMetadata.get(existingIssue.body, 'test.failCount') || 0) + 1;
        const newBody = markdownMetadata.set(existingIssue.body, 'test.failCount', newCount);

        await githubClient.issues.edit({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          number: existingIssue.number,
          state: 'open',  // Reopen issue if it was closed.
          body: newBody
        });

        // Append a new comment
        await githubClient.issues.createComment({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          number: existingIssue.number,
          body: `New failure: [Jenkins Build](${BUILD_URL})`
        });

        console.log(`Updated issue ${existingIssue.html_url}, failCount: ${newCount}`);
      } else {
        let body = 'A test failed on a tracked branch\n' +
          '```\n' + failureCase.failure + '\n```\n' +
          `First failure: [Jenkins Build](${BUILD_URL})`;
        body = markdownMetadata.set(body, {
          'test.class': failureCase.classname,
          'test.name': failureCase.name,
          'test.failCount': 1
        });

        const newIssue = await githubClient.issues.create({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          title: `Failing test: ${failureCase.classname} - ${failureCase.name}`,
          body: body,
          labels: [GITHUB_FLAKY_TEST_LABEL]
        });

        console.log(`Created issue ${newIssue.data.html_url}`);
      }
    }));

    return failureCases;
  });
};

/**
 * Scans all junit XML files in ./target/junit/ and reports any found test failures to Github Issues.
 */
export async function reportFailedTests() {
  const githubClient = getGithubClient();
  const issues = await paginate(githubClient, githubClient.issues.getForRepo({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    labels: GITHUB_FLAKY_TEST_LABEL,
    state: 'all',
    per_page: 100
  }));

  vfs
    .src(['./target/junit/**/*.xml'])
    .pipe(mapXml)
    .pipe(filterFailures)
    .pipe(updateGithubIssues(githubClient, issues))
    .on('done', () => console.log(`Finished reporting test failures.`));
}
