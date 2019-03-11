const Octokit = require('@octokit/rest')
const App = require('@octokit/app');
const request = require('@octokit/request');

const getInstallation = async function(jwt){
  return await request('GET /repos/:owner/:repo/installation', {
  owner: 'elastic',
  repo: 'kibana',
  headers: {
    authorization: `Bearer ${jwt}`,
    accept: 'application/vnd.github.machine-man-preview+json'
  }
});
}

const start = async function(){
  console.log('hi from script');
  const app = new App({
    id: 26774,
    privateKey: process.env.KIBANA_CI_REPORTER_KEY
  });

  const jwt = app.getSignedJsonWebToken();
  const { data } = await requesty('GET /repos/:owner/:repo/installation', {
    owner: 'elastic',
    repo: 'kibana',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json'
    }
  });

  const installationId = data.id;
  const installationAccessToken = await app.getInstallationAccessToken({ installationId })


  const clientWithAuth = new Octokit({ auth: `token ${installationAccessToken}` });

  console.log('creating check');
  clientWithAuth.checks.create({
    owner:'elastic',
    repo:'kibana',
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
  }).then(({headers: {'x-ratelimit-limit': limit, 'x-ratelimit-remaining': remaining}}) => console.log(`limit: ${remaining} / ${limit}`));
  console.log('check created');

}

start();

