const Octokit = require('@octokit/rest')

/*
octokit.repos.listForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})

function getGithubClient() {
  const client = new Octokit();

  client.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
  });

  return client;
}
console.log('START TEST');

const client = getGithubClient();

client.repos.getForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})
*/

const clientWithAuth = new Octokit({ auth: process.env.GITHUB_TOKEN });

console.log('creating check');
clientWithAuth.checks.create({
  owner:'elastic',
  repo:'kibana',
  name: 'check name',
  head_sha: process.env.ghprbActualCommit,
  details_url: 'http://www.google.com',
  external_id: 'external id',
  status: 'in_progress',
  output: {
    title: 'title',
    summary: 'summary',
    text: 'text',
  },
});
console.log('check created');

/*
clientWithAuth.repos.listForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})
*/


console.log('hi from script');
