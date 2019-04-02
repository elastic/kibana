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
const stripAnsi = require('strip-ansi');

const MAX_DETAIL_BYTES = 65535;

const getClientWithAuth = async function () {
  const app = new App({
    id: 26774,
    privateKey: process.env.KIBANA_CI_REPORTER_KEY
  });

  const jwt = app.getSignedJsonWebToken();
  const { data: { id: installationId } } = await request('GET /repos/:owner/:repo/installation', {
    owner: 'elastic',
    repo: 'kibana',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json'
    }
  });

  const installationAccessToken = await app.getInstallationAccessToken({ installationId });

  return new Octokit({ auth: `token ${installationAccessToken}` });
};

// -------------

const prettyLogs = txt => {
  const truncatedTxt = `[truncated]\n`;

  const noAnsi = stripAnsi(txt.toString()).trim();

  if(noAnsi.length === 0) {
    return 'no output';
  }

  let bufferToFit = Buffer.from(noAnsi).slice(MAX_DETAIL_BYTES * -1);

  const prependTxt = bufferToFit.length === MAX_DETAIL_BYTES ? truncatedTxt : '';

  bufferToFit = bufferToFit.slice(MAX_DETAIL_BYTES * -1 + prependTxt.length);

  return `${truncatedTxt}${bufferToFit.toString()}`;
};

const logRateLimit = ({
  headers: {
    'x-ratelimit-limit': limit,
    'x-ratelimit-remaining': remaining
  } }) => console.log(`GitHub checks API - ${remaining} remaining out of ${limit}/hour`);

const start = async function () {
  const [owner, repo] = process.env.ghprbGhRepository.split('/');
  const name = process.argv[2];
  const cmd = process.argv[3];
  const cmdArgs = process.argv.slice(4);
  const cmdSpawnConfig = {
    stdio: ['inherit', 'pipe', 'inherit']
  };
  let cmdLogs = '';
  const title = `${cmd} ${cmdArgs.join(' ')}`;

  console.log('spawn', title, cmd, cmdArgs.join(' '));

  const clientWithAuth = await getClientWithAuth();
  //todo check env vars

  const commonArgs = {
    owner,
    repo,
    name,
    head_sha: process.env.ghprbActualCommit,
    details_url: process.env.BUILD_URL,
  };

  clientWithAuth.checks.create({
    ...commonArgs,
    started_at: new Date().toISOString(),
    status: 'in_progress',
    output: {
      title,
      summary: `in progress`,
    },
  }).then(logRateLimit);

  const ls = spawn(cmd, cmdArgs, cmdSpawnConfig);
  ls.stdout.pipe(process.stdout);
  for await (const data of ls.stdout) {
    cmdLogs += data;
  }

  ls.on('close', (code) => {
    const logs = prettyLogs(cmdLogs);

    clientWithAuth.checks.create({
      ...commonArgs,
      conclusion: code === 0 ? 'success' : 'failure',
      completed_at: new Date().toISOString(),
      output: {
        title,
        summary: `.`,
        text: `\`\`\`${logs}\`\`\``
      },
    }).then((response) => {
      logRateLimit(response);
      process.exit(code);
    });
  });
};

console.log('**********JUST BEFORE START');
start();
