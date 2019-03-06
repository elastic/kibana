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

clientWithAuth.repos.listForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})

console.log('hi from script');
