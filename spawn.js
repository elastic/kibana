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
  /*
  const clientWithAuth = new Octokit({ auth: `token ${installationAccessToken}` });

  console.log('creating check');
  clientWithAuth.checks.create({
    owner: 'elastic',
    repo: 'kibana',
    name: 'check name',
    head_sha: process.env.ghprbActualCommit,
    // head_sha: '7680ee538b1443fbb5f8d7a1e3c335bf477dbbdf',
    details_url: 'http://www.google.com',
    external_id: 'external id',
    status: 'in_progress',
    output: {
      title: 'title',
      summary: 'summary',
      text: 'text',
    },
  }).then(({ headers: { 'x-ratelimit-limit': limit, 'x-ratelimit-remaining': remaining } }) => console.log(`limit: ${remaining} / ${limit}`));
  console.log('check created');
*/
};

// -------------

const start = async function () {
  const title = process.argv[2];
  const cmd = process.argv[3];
  const cmdArgs = process.argv.slice(4);
  const cmdSpawnConfig = { cwd: __dirname, stdio: 'inherit' };

  console.log('spawn', title, cmd, cmdArgs.join(' '));

  const clientWithAuth = await getClientWithAuth();
  //todo check env vars
  //todo - fire api request
  //get title
  clientWithAuth.checks.create({
    owner: 'elastic',
    repo: 'kibana',
    name: title,
    head_sha: process.env.ghprbActualCommit,
    started_at: new Date().toISOString(),
    // head_sha: '7680ee538b1443fbb5f8d7a1e3c335bf477dbbdf',
    //details_url: 'http://www.google.com',
    //external_id: 'external id',
    status: 'in_progress',
    output: {
      title: cmdArgs.join(' '),
      summary: `.`,
    },
  }).then(({
    headers: {
      'x-ratelimit-limit': limit,
      'x-ratelimit-remaining': remaining
    } }) => console.log(`limit: ${remaining} / ${limit}`));
  //.catch(err => console.log('*************ERROR: ', err));

  const ls = spawn(cmd, cmdArgs, cmdSpawnConfig);

  //todo - fire api request before exiting
  // determine success or failure
  ls.on('close', (code) => {
    console.log('******************TASK COMPLETE');
    clientWithAuth.checks.create({
      owner: 'elastic',
      repo: 'kibana',
      name: title,
      head_sha: process.env.ghprbActualCommit,
      // head_sha: '7680ee538b1443fbb5f8d7a1e3c335bf477dbbdf',
      //details_url: 'http://www.google.com',
      //external_id: 'external id',
      //status: 'complete',
      conclusion: code === 0 ? 'success' : 'failure',
      completed_at: new Date().toISOString(),
      output: {
        title: cmdArgs.join(' '),
        summary: `summary`,
        text: `text`,
      },
    }).then(({
      headers: { 'x-ratelimit-limit': limit,
        'x-ratelimit-remaining': remaining } }) => {
      console.log(`limit: ${remaining} / ${limit}`);
      process.exit(code);});
  });
  //.catch(err => console.log('*************ERROR: ', err));

};

console.log('**********JUST BEFORE START');
start();
