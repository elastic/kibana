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


const { spawn } = require('child_process');
const Octokit = require('@octokit/rest');
const App = require('@octokit/app');
const request = require('@octokit/request');

/*
const getInstallation = async function (jwt) {
  return await request('GET /repos/:owner/:repo/installation', {
    owner: 'elastic',
    repo: 'kibana',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json'
    }
  });
};
*/

const getClientWithAuth = async function () {
  console.log('hi from script');
  console.log('length', process.env.GITHUB_TOKEN.length);
  const app = new App({
    id: 26774,
    privateKey: process.env.KIBANA_CI_REPORTER_KEY
  });

  const jwt = app.getSignedJsonWebToken();
  const { data } = await request('GET /repos/:owner/:repo/installation', {
    owner: 'elastic',
    repo: 'kibana',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json'
    }
  });

  const installationId = data.id;
  const installationAccessToken = await app.getInstallationAccessToken({ installationId });

  return new Octokit({ auth: `token ${installationAccessToken}` });
};

// -------------

const start = async function () {
  const [owner, repo] = process.env.ghprbGhRepository.split('/');
  const title = process.argv[2];
  const cmd = process.argv[3];
  const cmdArgs = process.argv.slice(4);
  const cmdSpawnConfig = {
    stdio: ['inherit', 'pipe', 'inherit']
  };
  let cmdLogs = '';

  console.log('spawn', title, cmd, cmdArgs.join(' '));

  const clientWithAuth = await getClientWithAuth();
  //todo check env vars

  const commonArgs = {
    owner,
    repo,
    name: title,
    head_sha: process.env.ghprbActualCommit,
    details_url: process.env.BUILD_URL,
  };

  clientWithAuth.checks.create({
    ...commonArgs,
    started_at: new Date().toISOString(),
    status: 'in_progress',
    output: {
      title: `${cmd} ${cmdArgs.join(' ')}`,
      summary: `in progress`,
    },
  }).then(({
    headers: {
      'x-ratelimit-limit': limit,
      'x-ratelimit-remaining': remaining
    } }) => console.log(`GitHub checks API - ${remaining} remaining out of ${limit}/hour`));

  const ls = spawn(cmd, cmdArgs, cmdSpawnConfig);
  ls.stdout.pipe(process.stdout);
  for await (const data of ls.stdout) {
    cmdLogs += data;
  }

  ls.on('close', (code) => {
    console.log('******************TASK COMPLETE');
    clientWithAuth.checks.create({
      ...commonArgs,
      conclusion: code === 0 ? 'success' : 'failure',
      completed_at: new Date().toISOString(),
      output: {
        title: `${cmd} ${cmdArgs.join(' ')}`,
        summary: `.`,
        text: `\`\`\`${cmdLogs ? cmdLogs : 'no output'}\`\`\``
      },
    }).then(({
      headers: { 'x-ratelimit-limit': limit,
        'x-ratelimit-remaining': remaining } }) => {
      console.log(`GitHub checks API - ${remaining} remaining out of ${limit}/hour`);
      process.exit(code);});
  });
};

console.log('**********JUST BEFORE START');
start();
